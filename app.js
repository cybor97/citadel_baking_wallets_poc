const proc = require('child_process');
const express = require('express');
const fs = require('fs');
const path = require('path');
const expect = require('./expect');
const app = express();
const EXPECT_IMPORT_KEY_TEMPLATE = fs.readFileSync(path.join(__dirname, 'importKeyTemplate.sh'));
const EXPECT_CREATE_KEY_TEMPLATE = fs.readFileSync(path.join(__dirname, 'createKeyTemplate.sh'));
const EXPECT_START_BAKING_TEMPLATE = fs.readFileSync(path.join(__dirname, 'startBakingTemplate.sh'));

app
.use(express.json())
.use(express.urlencoded({extended: true}))
.post('/importKey', (req, res) => {
    let procInstanceCheckBalance = proc.spawn('tezos-client', ['get', 'balance', 'for', req.body.accName]);

    procInstanceCheckBalance.stderr.on('data', err => {
        err = err.toString();

        if(err.match(/no contract or key named/)){
            let importKeyScript = EXPECT_IMPORT_KEY_TEMPLATE.toString()
                .replace(/ACC_NAME/, req.body.accName)
                .replace(/ACC_EMAIL/, req.body.accEmail)
                .replace(/SECRET_WORDS/, req.body.words
                    .map((word, i) => `expect "Enter word ${i+1}:"; send "${word}\r";`)
                    .join('\n'))
                .replace(/PAPER_WALLET_PASSWORD/, req.body.paperWalletPassword)
                .replace(/ENCRYPTION_PASSWORD/g, req.body.encryptionPassword);
            expect.runInExpect(importKeyScript, result => res.status(200).send(result));
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
    let startBakingKeyScript = EXPECT_START_BAKING_TEMPLATE.toString()
        .replace(/ACC_NAME/, req.body.accName)
        .replace(/ENCRYPTION_PASSWORD/g, req.body.encryptionPassword);
    expect.runInExpect(startBakingKeyScript, result => res.status(200).send(result));
})
.post('/createKey', (req, res) => {
    let createKeyScript = EXPECT_CREATE_KEY_TEMPLATE.toString()
        .replace(/ACC_NAME/, req.body.accName)
        .replace(/ENCRYPTION_PASSWORD/g, req.body.encryptionPassword);
    expect.runInExpect(createKeyScript, result => res.status(200).send(result));
})
.listen(8081);
