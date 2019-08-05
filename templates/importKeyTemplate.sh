#!/usr/bin/expect -f
set timeout 10;
spawn tezos-client import fundraiser secret key ACC_NAME;
expect "Enter the e-mail used for the paper wallet:";
send "ACC_EMAIL\r";

SECRET_WORDS

expect "Enter the password used for the paper wallet:";
send "PAPER_WALLET_PASSWORD\r";
expect -re "Your public Tezos address is \[a-zA-Z0-9\]* is that correct? (Y/n/q):";
send "Y\r";
expect "Enter password to encrypt your key:";
send "ENCRYPTION_PASSWORD\r";
expect "Confirm password:";
send "ENCRYPTION_PASSWORD\r";
expect "Enter password for encrypted key:";
send "ENCRYPTION_PASSWORD\r";

foreach {pid spawnid os_error_flag value} [wait] break

exit;
