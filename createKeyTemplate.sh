#!/usr/bin/expect -f
set timeout 1;
spawn tezos-client gen keys ACC_NAME;
expect "Enter password to encrypt your key:";
send "ENCRYPTION_PASSWORD\r";
expect "Confirm password:";
send "ENCRYPTION_PASSWORD\r";

foreach {pid spawnid os_error_flag value} [wait] break

exit;
