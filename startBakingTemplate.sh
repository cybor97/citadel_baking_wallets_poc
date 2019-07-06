#!/usr/bin/expect -f
set timeout 1;
spawn tezos-baker run with local node /home/ubuntu/.tezos-node ACC_NAME;
expect "Enter password for encrypted key \"ACC_NAME\":";
send "ENCRYPTION_PASSWORD\r";
set timeout 10;
expect "Baker started.";
exit;