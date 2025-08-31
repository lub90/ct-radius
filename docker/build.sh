#!/bin/bash

cd ./ct-radius-base/
sudo ./build.sh

cd ../ct-radius-server/
sudo ./build.sh

cd ../ct-radius-sync
sudo ./build.sh

cd ../