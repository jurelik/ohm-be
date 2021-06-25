#!/bin/sh

ipfs init --profile flatfs # use flatfs datastore
ipfs config profile apply server # use the server config to avoid local discovery
ipfs config Datastore.GCPeriod 30m # how often does the server garbage collect
