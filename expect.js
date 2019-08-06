const child_process = require('child_process');

module.exports = {
    runInExpect: (script, callback, callbackTriggerRegex, triggeredCallback) => {
        let proc = child_process.spawn('expect');
        let output = [];
        let errors = [];
        proc.stdin.write(script);
        proc.stdout.on('data', result => {
            result = result.toString();
            output.push(result);
            if(callbackTriggerRegex && result.match(callbackTriggerRegex) && triggeredCallback){
                triggeredCallback({
                    output: output,
                    errors: errors,
                    code: 0,
                    signal: null    
                });
            }
        });
        proc.stderr.on('data', result => {
            result = result.toString();
            errors.push(result);

            if(callbackTriggerRegex && result.match(callbackTriggerRegex) && triggeredCallback){
                triggeredCallback({
                    output: output,
                    errors: errors,
                    code: 0,
                    signal: null    
                });
            }
        });

        proc.on('exit', (code, signal) => {
            callback({
                output: output,
                errors: errors,
                code: code,
                signal: signal
            });
        })
    }
};