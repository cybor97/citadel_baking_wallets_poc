#!/usr/bin/expect -f
set timeout 10;
spawn tezos-baker run with local node OS_HOMEDIR/.tezos-node ACC_NAME;
expect -re "Enter password for encrypted key \[a-zA-Z0-9\"\]*:";
send "ENCRYPTION_PASSWORD\r";
expect -re "Baker started\.";
exit;