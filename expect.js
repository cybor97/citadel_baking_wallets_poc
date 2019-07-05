const child_process = require('child_process');

module.exports = {
    runInExpect: (script, callback) => {
        let proc = child_process.spawn('expect');
        let output = [];
        let errors = [];
        proc.stdin.write(script);
        proc.stdout.on('data', result => output.push(result.toString()));
        proc.stderr.on('data', result => errors.push(result.toString()));

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