const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require("path")
const log4js = require('log4js');
const logger = log4js.getLogger('BasicNetwork');
const util = require('util');
const colors = require('colors');
const shell = require('shelljs');

const bashFilesDir = path.join(__dirname, '../bash-files');

const helper = require('./helper')


const invokeTransaction = async (channelName, chaincodeName, fcn, args, username, orgName, transientData, res) => {
    try {
        logger.debug(util.format('\n============ invoke transaction on channel %s ============\n', channelName));

        // load the network configuration
        const ccpPath =path.resolve(__dirname, '..', 'config', 'connection-org1.json');
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8')
        const ccp = await helper.getCCP(orgName) //JSON.parse(ccpJSON);

        // Create a new file system based wallet for managing identities.
        const walletPath = await helper.getWalletPath(orgName) //path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        let identity = await wallet.get(username);
        if (!identity) {
            console.log(`An identity for the user ${username} does not exist in the wallet, so registering user`);
            await helper.getRegisteredUser(username, orgName, true)
            identity = await wallet.get(username);
            console.log('Run the registerUser.js application before retrying');
            return;
        }


        let result
        let message;
        if (fcn === "createCar") 
        {
            let orgNumber = orgName.match(/\d/g).join("");
            
            let shellResult = shell.exec(`${bashFilesDir}/createCar.sh ${username} ${orgName.toLowerCase()} ${orgNumber} ${channelName} ${chaincodeName} \
                ${args[0]} ${args[1]} ${args[2]} ${args[3]} ${args[4]}`, {silent: true});
    
            if (shellResult.code !== 0) {
                let shellError = shellResult.stderr;
                console.log(colors.bgRed("Error in createCar.sh"));
                console.log(colors.red(shellError));
                return;
            }
            else message = `Successfully added the car asset with key ${args[0]}`;
        } 

        else {
            return `Invocation require either createCar or changeCarOwner as function but got ${fcn}`
        }


        let response = {
            message: message
        }

        return response;


    } catch (error) {

        console.log(`Getting error: ${error}`)
        return error.message

    }
}

exports.invokeTransaction = invokeTransaction;