const { Gateway, Wallets, TxEventHandler, GatewayOptions, DefaultEventHandlerStrategies, TxEventHandlerFactory } = require('fabric-network');
const fs = require('fs');
const path = require("path")
const log4js = require('log4js');
const logger = log4js.getLogger('BasicNetwork');
const util = require('util');
const colors = require('colors');
const shell = require('shelljs');

const { spawn } = require('child_process');

const bashFilesDir = path.join(__dirname, '../bash-files');

// const createTransactionEventHandler = require('./MyTransactionEventHandler.ts')

const helper = require('./helper')

// const createTransactionEventHandler = (transactionId, network) => {
//     /* Your implementation here */
//     const mspId = network.getGateway().getIdentity().mspId;
//     const myOrgPeers = network.getChannel().getEndorsers(mspId);
//     return new MyTransactionEventHandler(transactionId, network, myOrgPeers);
// }

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


        // // #changed
        // const connectOptions = {
        //     wallet, identity: username, discovery: { enabled: true, asLocalhost: true },
        //     // eventHandlerOptions: {
        //     //     commitTimeout: 100,
        //     //     strategy: DefaultEventHandlerStrategies.NETWORK_SCOPE_ALLFORTX
        //     // }
        //     // transaction: {
        //     //     strategy: createTransactionEventhandler()
        //     // }
        // }

        // // Create a new gateway for connecting to our peer node.
        // const gateway = new Gateway();
        // await gateway.connect(ccp, connectOptions);

        // // Get the network (channel) our contract is deployed to.
        // const network = await gateway.getNetwork(channelName);

        // const contract = network.getContract(chaincodeName);


        let result
        let message;
        if (fcn === "createCar" || fcn === "createPrivateCarImplicitForOrg1"
        || fcn == "createPrivateCarImplicitForOrg2") 
        {
            // let shellResult = shell.exec(`${bashFilesDir}/createCar.sh ${OrgNumber} ${args[0]} ${args[1]} ${args[2]} ${args[3]} ${args[4]} `);

            let orgNumber = orgName.match(/\d/g).join("");
            
            let shellResult = shell.exec(`${bashFilesDir}/createCar.sh ${username} ${orgName.toLowerCase()} ${orgNumber} ${channelName} ${chaincodeName} \
                ${args[0]} ${args[1]} ${args[2]} ${args[3]} ${args[4]}`, {silent: false});
    
            if (shellResult.code !== 0) {
                let shellError = shellResult.stderr;
                console.log(colors.bgRed("Error in createCar.sh"));
                console.log(colors.red(shellError));
                return;
            }
            else message = `Successfully added the car asset with key ${args[0]}`;
        } 


        else if (fcn === "changeCarOwner") {
            result = await contract.submitTransaction(fcn, args[0], args[1]);
            message = `Successfully changed car owner with key ${args[0]} to ${args[1]}`; 
        } 
        else if (fcn == "createPrivateCar" || fcn == "updatePrivateData") {
            console.log(`Transient data is : ${transientData}`)
            let carData = JSON.parse(transientData)
            console.log(`car data is : ${JSON.stringify(carData)}`)
            let key = Object.keys(carData)[0]
            const transientDataBuffer = {}
            transientDataBuffer[key] = Buffer.from(JSON.stringify(carData.car))
            result = await contract.createTransaction(fcn)
                .setTransient(transientDataBuffer)
                .submit()

            message = `Successfully submitted transient data`
        }
        else {
            return `Invocation require either createCar or changeCarOwner as function but got ${fcn}`
        }


        // await gateway.disconnect();

        // result = JSON.parse(result.toString());

        let response = {
            message: message
            // result
        }


        return response;


    } catch (error) {

        console.log(`Getting error: ${error}`)
        return error.message

    }
}

exports.invokeTransaction = invokeTransaction;