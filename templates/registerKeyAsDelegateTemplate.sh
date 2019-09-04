#!/usr/bin/expect -f
set timeout 10;
spawn tezos-client register key ACC_NAME as delegate;
exit;