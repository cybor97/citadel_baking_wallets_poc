const proc = require('child_process');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const EXPECT_TEMPLATE = fs.readFileSync(path.join(__dirname, 'scriptTemplate.sh'));

app
.use(express.json())
.use(express.urlencoded({extended: true}))
.post('/importKey', (req, res) => {
    let procInstanceCheckBalance = proc.spawn('tezos-client', ['get', 'balance', 'for', req.body.accName]);

    procInstanceCheckBalance.stderr.on('data', err => {
        err = err.toString();

        if(err.match(/no contract or key named/)){
            let importKeyScript = EXPECT_TEMPLATE.toString()
                .replace(/ACC_NAME/, req.body.accName)
                .replace(/ACC_EMAIL/, req.body.accEmail)
                .replace(/SECRET_WORDS/, req.body.words
                    .map((word, i) => `expect "Enter word ${i+1}:"; send "${word}\r";`)
                    .join('\n'))
                .replace(/PAPER_WALLET_PASSWORD/, req.body.paperWalletPassword)
                .replace(/ENCRYPTION_PASSWORD/g, req.body.encryptionPassword);
            let procImportKey = proc.spawn('expect');
            let output = [];
            let errors = [];
            procImportKey.stdin.write(importKeyScript);
            procImportKey.stdout.on('data', result => {
                result = result.toString();
                console.log(result);
                output.push(result);
            });
            procImportKey.stderr.on('data', result => {
                result = result.toString();
                console.error('err', result);
                errors.push(result);
            });
            procImportKey.on('exit', (code, signal) => {
                res.status(200).send({
                    output: output,
                    errors: errors,
                    code: code,
                    signal: signal
                });
            })
        }
        else if(err && !err.trim().match(/^Disclaimer:[\s\S]*in their network interactions\.$/mg)){
            res.status(500).send(err);
        }
    });
    procInstanceCheckBalance.stdout.on('data', data => {
        data = data.toString();
        let balanceMatch = data.match(/\d* ꜩ/); 
        if(balanceMatch){
            res.status(400).send(`Wallet already exists and has ${balanceMatch[0]} on balance.`);
        }
    })
})
.post('/startBaking', (req, res) => {
    let procInstanceStartBake = proc.spawn('/home/ubuntu/tezos/tezos-baker-003-PsddFKi3', 'run', 'with', 'local', 'node', '/home/ubuntu/.tezos-node', req.body.accName);
    procInstanceStartBake.stdout.on('data', data => {
        data = data.toString();

        if(data.match(/Enter password for encrypted key/)){
            procInstanceStartBake.stdin.write(req.body.userPassword);
        }
        else if(data.match(/Node synchronized/)){
            res.status(200).send(data);
        }
    });
    procInstanceStartBake.on('error', err => {
        console.error(err.toString());
    });

})
.listen(8081);
