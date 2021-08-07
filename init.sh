#!/bin/sh

ipfs init --profile flatfs # use flatfs datastore
ipfs config profile apply server # use the server config to avoid local discovery
ipfs config Datastore.GCPeriod 1h # how often does the server garbage collect
