const proc = require('child_process');
const express = require('express');
const fs = require('fs');
const path = require('path');
const expect = require('./expect');
const eztz = require('eztz.js');
const app = express();
//TODO:Review template usage(reimplement without external apps usage)
const EXPECT_IMPORT_KEY_TEMPLATE = fs.readFileSync(path.join(__dirname, 'templates/importKeyTemplate.sh'));
const EXPECT_CREATE_KEY_TEMPLATE = fs.readFileSync(path.join(__dirname, 'templates/createKeyTemplate.sh'));
const EXPECT_START_BAKING_TEMPLATE = fs.readFileSync(path.join(__dirname, 'templates/startBakingTemplate.sh'));
//TODO:Reimplement with "real" task management
const importKeyQueue = {/**accName: state*/};
const bakingStates = {/**accName: state */};

app
.use(express.json())
.use(express.urlencoded({extended: true}))
.use('/doc', express.static(path.join(__dirname, 'doc')))

/**
 * @api {post} /importKey Import key data
 * @apiName importKey
 * @apiGroup keys
 * @apiDescription Import key data for tezos-client and tezos-baker
 * 
 * @apiParam {String} accName               Unique name of account    
 * @apiParam {String} accEmail              Account email
 * @apiParam {Array}  words                 15 secret words
 * @apiParam {String} paperWalletPassword   Paper wallet password
 * @apiParam {String} encryptionPassword    Encryption password
 *
 * @apiSuccess {Object} importKeyState {"accName": "someAccName", "address": "tz12345",  "state": "enqueued/processing/imported/error"}
 */
.post('/importKey', (req, res) => {
    let keys = eztz.eztz.crypto.generateKeys(req.body.words.join(' '), req.body.accEmail+req.body.paperWalletPassword);
    
    if(!importKeyQueue[req.body.accName]){
        importKeyQueue[req.body.accName] = 'enqueued';
    }
    res.status(200).send({accName: req.body.accName, address: keys.pkh, state: importKeyQueue[req.body.accName]});

    if(importKeyQueue[req.body.accName] !== 'processing'){
        let procInstanceCheckBalance = proc.spawn('tezos-client', ['get', 'balance', 'for', req.body.accName]);
        importKeyQueue[req.body.accName] = 'processing';

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
                expect.runInExpect(importKeyScript, result => {
                    if(result.errors.match(/already exists/gm) || result.code == 0){
                        importKeyQueue[req.body.accName] = 'imported';
                    }
                    else{
                        importKeyQueue[req.body.accName] = 'error';
                    }
                });
            }
            else if(err && !err.trim().match(/^Disclaimer:[\s\S]*in their network interactions\.$/mg)){
                importKeyQueue[req.body.accName] = 'error';
                console.error(err);
            }
        });
        procInstanceCheckBalance.stdout.on('data', data => {
            data = data.toString();
            let balanceMatch = data.match(/\d* ꜩ/); 
            if(balanceMatch){
                importKeyQueue[req.body.accName] = 'imported';
            }
        })    
    }
})


/**
 * @api {post} /createKey Create key pair
 * @apiName createKey
 * @apiGroup keys
 * @apiDescription Create key pair for tezos-client and tezos-baker
 * 
 * @apiParam {String} accName               Unique name of account    
 * @apiParam {String} encryptionPassword    Encryption password
 *
 * @apiSuccess {String} output Data from stdout(tezos-client response)
 * @apiSuccess {String} errors Data from stderr(tezos-client error or warning/notification)
 * @apiSuccess {String} code   Process exit code
 * @apiSuccess {String} signal Process exited by signal
 */
.post('/createKey', (req, res) => {
    let createKeyScript = EXPECT_CREATE_KEY_TEMPLATE.toString()
        .replace(/ACC_NAME/, req.body.accName)
        .replace(/ENCRYPTION_PASSWORD/g, req.body.encryptionPassword);
    expect.runInExpect(createKeyScript, result => res.status(200).send(result));
})

/**
 * @api {post} /startBaking Start baking
 * @apiName startBaking
 * @apiGroup keys
 * @apiDescription Start baking with tezos-baker
 * 
 * @apiParam {String} accName               Unique name of account    
 * @apiParam {String} encryptionPassword    Encryption password
 *
 * @apiSuccess {Object} bakingState {"accName": "someAccName", "state": "enqueued/processing/baking/stopped"}
 */
.post('/startBaking', (req, res) => {
    let accName = req.body.accName;

    if(!bakingStates[accName]){
        bakingStates[accName] = 'enqueued';
    }

    if(bakingStates[accName] != 'processing' && bakingStates[accName] != 'baking'){
        let startBakingKeyScript = EXPECT_START_BAKING_TEMPLATE.toString()
            .replace(/ACC_NAME/, req.body.accName)
            .replace(/ENCRYPTION_PASSWORD/g, req.body.encryptionPassword);

        bakingStates[accName] = 'processing';

        expect.runInExpect(startBakingKeyScript, 
            (result) => {
                bakingStates[accName] = 'stopped';
                console.log(result);
            }, 
            /Baker started\./g, () => {
                bakingStates[accName] = 'baking';
                res.status(200).send({accName: req.body.accName, state: bakingStates[req.body.accName]});
            });
    }
    else{
        res.status(200).send({accName: req.body.accName, state: bakingStates[req.body.accName]});
    }
})

/**
 * @api {get} /state/importKey Import key state
 * @apiName stateImportKey
 * @apiGroup state
 * @apiDescription Check import key state for accName
 * 
 * @apiParam {String} accName               Unique name of account    
 *
 * @apiSuccess {Object} importKeyState {"accName": "someacc", "state": "enqueued/processing/imported/error"|null}
 */
.get('/state/importKey', (req, res) => {   
    res.status(200).send({accName: req.query.accName, state: importKeyQueue[req.query.accName] || null});
})

/**
 * @api {get} /state/baking Check baking state
 * @apiName stateBaking
 * @apiGroup state
 * @apiDescription Check baking state for accName
 * 
 * @apiParam {String} accName               Unique name of account    
 *
 * @apiSuccess {Object} BakingState {"accName": "someAccName", "state": "enqueued/processing/imported/error"|null}
 */
.get('/state/baking', (req, res) => {
    res.status(200).send({accName: req.query.accName, state: bakingStates[req.query.accName] || null});
})

.listen(8080);
