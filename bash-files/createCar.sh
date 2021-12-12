#!/bin/bash

##########################################################
#                    Input Variables
##########################################################

username=$1
orgName=$2
orgNumber=$3
CHANNEL_NAME=$4
CC_NAME=$5
id=$6
make=$7
model=$8
colour=$9
owner=${10}


##########################################################
#               Paths, Addresses and Ports
##########################################################

addr_peer0_org1="peer0.org1.example.com"
addr_peer1_org1="peer1.org1.example.com"
addr_peer0_org2="peer0.org2.example.com"
addr_peer1_org2="peer1.org2.example.com"
addr_peer0_org3="peer0.org3.example.com"
addr_peer1_org3="peer1.org3.example.com"

port_peer0_org1="7051"
port_peer1_org1="8051"
port_peer0_org2="9051"
port_peer1_org2="10051"
port_peer0_org3="11051"
port_peer1_org3="12051"

addr_orderer0_org1="orderer0.org1.example.com"
addr_orderer1_org1="orderer1.org1.example.com"
addr_orderer0_org2="orderer0.org2.example.com"
addr_orderer1_org2="orderer1.org2.example.com"
addr_orderer0_org3="orderer0.org3.example.com"

port_orderer0_org1="7050"
port_orderer1_org1="8050"
port_orderer0_org2="9050"
port_orderer1_org2="10050"
port_orderer0_org3="11050"

if [ $orgNumber == 1 ]
then
    ca_port="7054"           # CA port of Org1
    peer0_port="7051"        # peer0 port of Org1
    orderer0_port="7050"     # orderer0 port of Org1
    orderer1_port="8050"     # orderer1 port of Org1
elif [ $orgNumber == 2 ]
then
    ca_port="8054"           # CA port of Org2
    peer0_port="9051"        # peer0 port of Org2
    orderer0_port="9050"     # orderer0 port of Org2
    orderer1_port="10050"    # orderer0 port of Org2
elif [ $orgNumber == 3 ]
then
    ca_port="9054"           # CA port of Org3
    peer0_port="11051"       # peer0 port of Org3
    orderer0_port="11050"    # orderer0 port of Org3
fi

path_cafile="/etc/hyperledger/channel/crypto-config/peerOrganizations/$orgName.example.com/orderers/orderer0.$orgName.example.com/tls/tlscacerts/tls-localhost-$ca_port-ca-$orgName-example-com.pem"
path_tlsRootCertFiles_org1="/etc/hyperledger/channel/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
path_tlsRootCertFiles_org2="/etc/hyperledger/channel/crypto-config/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"
path_tlsRootCertFiles_org3="/etc/hyperledger/channel/crypto-config/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt"

CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/channel/crypto-config/peerOrganizations/$orgName.example.com/users/$username@$orgName.example.com/msp"
CORE_PEER_ADDRESS=peer0.$orgName.example.com:$peer0_port
ORDERER_CA="/etc/hyperledger/channel/crypto-config/peerOrganizations/$orgName.example.com/orderers/orderer0.$orgName.example.com/tls/tlscacerts/tls-localhost-$ca_port-ca-$orgName-example-com.pem"
VERSION="1"


##########################################################
#               Add the car to the Ledger
##########################################################

cat << EOF | docker exec --interactive cli bash

    export CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH
    export CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS
    export ORDERER_CA=$ORDERER_CA
    export VERSION=$VERSION

    peer chaincode invoke -o orderer0.$orgName.example.com:$orderer0_port --ordererTLSHostnameOverride orderer0.$orgName.example.com \
    --tls --cafile $path_cafile -C $CHANNEL_NAME -n $CC_NAME \
    --peerAddresses $addr_peer0_org1:$port_peer0_org1 --tlsRootCertFiles $path_tlsRootCertFiles_org1 \
    --peerAddresses $addr_peer0_org2:$port_peer0_org2 --tlsRootCertFiles $path_tlsRootCertFiles_org2 \
    --peerAddresses $addr_peer0_org3:$port_peer0_org3 --tlsRootCertFiles $path_tlsRootCertFiles_org3 \
    -c '{"function": "createCar", "Args":["$id", "$make", "$model", "$colour", "$owner"]}'

EOF
