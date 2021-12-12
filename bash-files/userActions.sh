#!/bin/bash

##########################################################
#                    Input Variables
##########################################################

username=$1
orgName=$2
orgNumber=$3
role=$4
userPass="${username}pw"
caName="ca.${orgName}.example.com"

if [ $orgNumber == 1 ]
then
    caPort="7054"    # peer0 of Org2
elif [ $orgNumber == 2 ]
then
    caPort="8054"    # peer0 of Org2
elif [ $orgNumber == 3 ]
then
    caPort="9054"    # peer0 of Org3
fi


##########################################################
#                         Paths
##########################################################

fabric_samples_dir="/usr/local/go/src/github.com/hyperledger/fabric-samples"
test_network_dir="/usr/local/go/src/github.com/hyperledger/fabric-samples/test-network"
raft_2node_dir="/usr/local/go/src/github.com/hyperledger/fabric-samples/raft-2node"

cd $raft_2node_dir

org_dir="${PWD}/$orgName/crypto-config/peerOrganizations/$orgName.example.com"
userMSPfolder="$org_dir/users/$username@$orgName.example.com/msp"
orgConfigFile="$org_dir/msp/config.yaml"
orgCertFile="${PWD}/$orgName/create-certificate-with-ca/fabric-ca/$orgName/tls-cert.pem"


# export fabric paths
export PATH=$fabric_samples_dir/bin:$test_network_dir:$PATH
export FABRIC_CFG_PATH=$fabric_samples_dir/config/
export FABRIC_CA_CLIENT_HOME=$org_dir


##########################################################
#                   Register & Enroll
##########################################################

# register the user
fabric-ca-client register --caname $caName --id.name $username --id.secret $userPass --id.type $role \
--tls.certfiles "$orgCertFile"

# enroll the user
fabric-ca-client enroll -u https://$username:$userPass@localhost:$caPort --caname $caName \
-M "$userMSPfolder" --tls.certfiles "$orgCertFile"

# copy the Node OU configuration file into the user MSP folder
cp "$orgConfigFile" "$userMSPfolder/config.yaml"
