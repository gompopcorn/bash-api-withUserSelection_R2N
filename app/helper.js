'use strict';

var { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const shell = require("shelljs");
const colors = require("colors");

const util = require('util');
const { resolve } = require('path');
const { rejects } = require('assert');

const bashFilesDir = path.join(__dirname, '../bash-files');


const getCCP = async (org) => {
    let ccpPath;
    if (org == "Org1") {
        ccpPath = path.resolve(__dirname, '..', 'config', 'connection-org1.json');

    } else if (org == "Org2") {
        ccpPath = path.resolve(__dirname, '..', 'config', 'connection-org2.json');
    } 
    
    // #changed
    else if (org == "Org1-fabcar") {
        ccpPath = path.resolve(__dirname, '..', '..', 'organizations', 'peerOrganizations', 
        'org1.example.com', 'connection-org1.json');
    } 
    
    else return null

    const fileExists = fs.existsSync(ccpPath);

	if (!fileExists) {
		throw new Error(`no such file or directory: ${ccpPath}`);
	}

    const ccpJSON = fs.readFileSync(ccpPath, 'utf8')
    const ccp = JSON.parse(ccpJSON);
    return ccp
}


const getCaUrl = async (org, ccp) => {
    let caURL;
    if (org == "Org1") {
        caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;

    } else if (org == "Org2") {
        caURL = ccp.certificateAuthorities['ca.org2.example.com'].url;
    } 

    // #changed
    else if (org == "Org1-fabcar") {
        caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
    } 
    
    else
        return null
    return caURL

}

const getWalletPath = async (org) => {
    let walletPath;
    if (org == "Org1") {
        walletPath = path.join(process.cwd(), 'org1-wallet');

    } else if (org == "Org2") {
        walletPath = path.join(process.cwd(), 'org2-wallet');
    } 
    
    // #changed
    else if (org == "Org1-fabcar") {
        walletPath = path.resolve(process.cwd(), 'org1-fabcar-wallet"');
    } 
    
    else
        return null

    return walletPath;
}


const getAffiliation = async (org) => {
    return org == "Org1" ? 'org1.department1' : 'org2.department1'
}

const getRegisteredUser = async (username, userOrg, isJson) => {
    let ccp = await getCCP(userOrg)

    const caURL = await getCaUrl(userOrg, ccp)
    const ca = new FabricCAServices(caURL);

    const walletPath = await getWalletPath(userOrg)
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    const userIdentity = await wallet.get(username);
    if (userIdentity) {
        console.log(`An identity for the user ${username} already exists in the wallet`);
        var response = {
            success: true,
            message: username + ' enrolled Successfully',
        };
        return response
    }

    // Check to see if we've already enrolled the admin user.
    let adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
        console.log('An identity for the admin user "admin" does not exist in the wallet');
        await enrollAdmin(userOrg, ccp);
        adminIdentity = await wallet.get('admin');

        console.log('\n------------------------------------------');
        console.log(adminIdentity);
        console.log('\n------------------------------------------');

        console.log("Admin Enrolled Successfully")
    }

    // // build a user object for authenticating with the CA
    // const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    // const adminUser = await provider.getUserContext(adminIdentity, 'admin');
    // let secret;
    // try {
    //     if (username == "superuser") {
    //         // Register the user, enroll the user, and import the new identity into the wallet.
    //         secret = await ca.register({ affiliation: 'org1.department1', enrollmentID: username, role: 'client', attrs: [{ name: 'role', value: 'admin', ecert: true }] }, adminUser);

    //     } else {
    //         secret = await ca.register({ affiliation: await getAffiliation(userOrg), enrollmentID: username, role: 'client' }, adminUser);

    //     }

    // } catch (error) {
    //     return error.message
    // }

    // let enrollment;
    // if (username == "superuser") {
    //     enrollment = await ca.enroll({ enrollmentID: username, enrollmentSecret: secret, attr_reqs: [{ name: 'role', optional: false }] });

    // } else {
    //     enrollment = await ca.enroll({ enrollmentID: username, enrollmentSecret: secret });

    // }


    // *****************************************************
    //             Register and Enroll the User
    // *****************************************************

    var response = {};

    let orgName = userOrg.toLowerCase();
    let orgNumber = orgName.match(/\d/g).join("");


    let shellResult = shell.exec(`${bashFilesDir}/userActions.sh ${username} ${orgName} ${orgNumber} client`, {silent: true});

    if (shellResult.code !== 0) {
        let shellError = shellResult.stderr;
        console.log(colors.bgRed("Error in userActions.sh"));
        console.log(colors.red(shellError));
        return res.status(500).send("Error in registering/enrolling the user");
    }

    let certificate_file = path.join(__dirname, `../../${orgName}/crypto-config/peerOrganizations/${orgName}.example.com/users/${username}@${orgName}.example.com/msp/signcerts/cert.pem`);
    let privateKey_path = path.join(__dirname, `../../${orgName}/crypto-config/peerOrganizations/${orgName}.example.com/users/${username}@${orgName}.example.com/msp/keystore`);

    let certificate = await getUserCertificate(certificate_file);
    let privateKey = await getUserPrivateKey(privateKey_path);


    let x509Identity;
    if (userOrg == "Org1" || userOrg == "Org2" || userOrg == "Org3") {
        x509Identity = {
            credentials: { certificate, privateKey },
            mspId: `${userOrg}MSP`,
            type: 'X.509',
        };
    }
    

    await wallet.put(username, x509Identity);
    console.log(`Successfully registered and enrolled admin user ${username} and imported it into the wallet`);

    response = {
        success: true,
        message: username + ' enrolled Successfully',
    };
    return response
}

const isUserRegistered = async (username, userOrg) => {
    const walletPath = await getWalletPath(userOrg)
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    const userIdentity = await wallet.get(username);
    if (userIdentity) {
        console.log(`An identity for the user ${username} exists in the wallet`);
        return true
    }
    return false
}


const getCaInfo = async (org, ccp) => {
    let caInfo
    if (org == "Org1") {
        caInfo = ccp.certificateAuthorities['ca.org1.example.com'];

    } else if (org == "Org2") {
        caInfo = ccp.certificateAuthorities['ca.org2.example.com'];
    } 

    // #changed
    else if (org == "Org1-fabcar") {
        caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    } 
    
    else
        return null
    return caInfo

}

const enrollAdmin = async (org, ccp) => {

    console.log('calling enroll Admin method')

    try {

        const caInfo = await getCaInfo(org, ccp) //ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // Create a new file system based wallet for managing identities.
        const walletPath = await getWalletPath(org) //path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the admin user.
        const identity = await wallet.get('admin');
        if (identity) {
            console.log('An identity for the admin user "admin" already exists in the wallet');
            return;
        }

        // Enroll the admin user, and import the new identity into the wallet.
        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        let x509Identity;
        if (org == "Org1") {
            x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: 'Org1MSP',
                type: 'X.509',
            };
        } else if (org == "Org2") {
            x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: 'Org2MSP',
                type: 'X.509',
            };
        } 
        
        else if (org == "Org3") {
            x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: 'Org3MSP',
                type: 'X.509',
            };
        }

        await wallet.put('admin', x509Identity);
        console.log('Successfully enrolled admin user "admin" and imported it into the wallet');
        return
    } catch (error) {
        console.error(`Failed to enroll admin user "admin": ${error}`);
    }
}

const registerAndGerSecret = async (username, userOrg) => {
    let ccp = await getCCP(userOrg)

    const caURL = await getCaUrl(userOrg, ccp)
    const ca = new FabricCAServices(caURL);

    const walletPath = await getWalletPath(userOrg)
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    const userIdentity = await wallet.get(username);
    if (userIdentity) {
        console.log(`An identity for the user ${username} already exists in the wallet`);
        var response = {
            success: true,
            message: username + ' enrolled Successfully',
        };
        return response
    }

    // Check to see if we've already enrolled the admin user.
    let adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
        console.log('An identity for the admin user "admin" does not exist in the wallet');
        await enrollAdmin(userOrg, ccp);
        adminIdentity = await wallet.get('admin');
        console.log("Admin Enrolled Successfully")
    }

    // build a user object for authenticating with the CA
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');
    let secret;
    try {
        // Register the user, enroll the user, and import the new identity into the wallet.
        secret = await ca.register({ affiliation: await getAffiliation(userOrg), enrollmentID: username, role: 'client' }, adminUser);
        // const secret = await ca.register({ affiliation: 'org1.department1', enrollmentID: username, role: 'client', attrs: [{ name: 'role', value: 'approver', ecert: true }] }, adminUser);

    } catch (error) {
        return error.message
    }

    var response = {
        success: true,
        message: username + ' enrolled Successfully',
        secret: secret
    };
    return response

}


function getProperWorkerID() {
    
}


// get user's certificate
async function getUserCertificate(certificate_file)
{
    let certificate = await new Promise((resolve, reject) => {
        fs.readFile(certificate_file, 'utf8', async (err, userCertificate) => {
            if (err) return reject(err);
            resolve(userCertificate);
        });

    }).catch(err => {
       console.log(colors.bgRed(`Error in reading user's certificate file in path: "${path}"`));
       console.log(colors.red(err));
    });


    return certificate;
}


// get user's certificate pricateKey
async function getUserPrivateKey(privateKey_path)
{
    let privateKeyFiles = await getListOfFilesAndDirs(privateKey_path);
    let privateKeyFile = await getOldestFilebyDate(privateKey_path, privateKeyFiles);

    let privateKey = await new Promise((resolve, reject) => {
        fs.readFile(`${privateKey_path}/${privateKeyFile}`, 'utf8', async (err, userPrivateKey) => {
            if (err) return reject(err);
            resolve(userPrivateKey);
        });

    }).catch(err => {
       console.log(colors.bgRed(`Error in reading user's privateKey file in path: "${privateKey_path}/${privateKeyFile}"`));
       console.log(colors.red(err));
    });


    return privateKey;
}


// get the list of the files/directories in a path
async function getListOfFilesAndDirs(path) 
{
    let filesList = await new Promise((resolve, reject) => {
        fs.readdir(path, 'utf8', async (err, files) => {
            if (err) return reject(err);
            resolve(files);
        });

    }).catch(err => {
       console.log(colors.bgRed(`Error in getting files list of the path: "${path}"`));
       console.log(colors.red(err));
    });
    

    return filesList;
}


async function getOldestFilebyDate(path, files)
{
    let oldestFileInfo = {date: 0, name: ""};
    let errorFlag = false;

    for (let i = 0; i < files.length; i++)
    {
        let fileStat = await new Promise((resolve, reject) =>
        {
            fs.stat(`${path}/${files[i]}`, "utf8", (err, fileStat) => {
                if (err) return reject(err);
                if (fileStat.isFile()) resolve(fileStat);
                else resolve();
            });

        }).catch(err => {
            errorFlag = true;
            console.log(colors.bgRed(`Error in getting stats of the file: '${files[i]}'`));
            console.log(colors.red(err));
        });
        

        if (errorFlag) break;

        else if (fileStat.birthtimeMs > oldestFileInfo.date) {
            oldestFileInfo.date = fileStat.birthtimeMs;
            oldestFileInfo.name = files[i];
        }
    }
    

    if (!errorFlag) return oldestFileInfo.name;
    return false;
}


// exports.getRegisteredUser = getRegisteredUser

module.exports = {
    getCCP: getCCP,
    getWalletPath: getWalletPath,
    getRegisteredUser: getRegisteredUser,
    isUserRegistered: isUserRegistered,
    registerAndGerSecret: registerAndGerSecret,
    getRegisteredUser: getRegisteredUser
}