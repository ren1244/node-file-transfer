const uploaderContainer = document.querySelector('#uploader');
const logEle = document.querySelector('pre');
const uploader = new MyComponent.FileUploader(uploaderContainer);

uploaderContainer.addEventListener('upload-files', (evt) => {
    const files = evt.detail.files;
    let success = [], error = [];
    let k = 0;
    function uploadOneFile() {
        if (k < files.length) {
            sendFile(files[k]).then((t) => {
                //傳送成功
                success.push(files[k++].name);
            }, (t) => {
                //傳送失敗
                error.push(files[k++].name);
            }).finally(() => {
                uploadOneFile();
            });
        } else {
            let s = '';
            if (success.length > 0) {
                s += `傳送成功:\n${success.join('\n')}\n`;
            }
            if (error.length > 0) {
                s += `傳送失敗:\n${error.join('\n')}\n`;
            }
            logEle.textContent = s;
        }
    }
    uploadOneFile();
});

function sendFile(file) {
    return new Promise((resolve, reject) => {
        let fd = new FormData;
        let t0, t1, sz = 0;
        fd.append('file', file);
        fd.append('test', 'hello');

        let xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('loadstart', (e) => {
            t0 = t1 = Date.now();
        });
        xhr.upload.addEventListener('progress', (e) => {
            let t = Date.now();
            let speed = (e.loaded - sz) * 1000 / (t - t1);
            let avgSpeed = e.loaded * 1000 / (t - t0);
            t1 = t;
            sz = e.loaded;
            logEle.textContent = `${e.loaded} / ${e.total}\n速度：${conv(speed)}\n平均：${conv(avgSpeed)}`;
            function conv(x) {
                if (x < 1024) {
                    return `${x} B/s`;
                } else if (x < 1024 * 1024) {
                    return `${Math.round(x * 100 / 1024) / 100} kB/s`;
                } else {
                    return `${Math.round(x * 100 / 1024 / 1024) / 100} MB/s`;
                }
            }
        });
        xhr.upload.addEventListener('load', (e) => {
            resolve('ok');
        });
        xhr.upload.addEventListener('abort', (e) => {
            reject('abort');
        });
        xhr.upload.addEventListener('error', (e) => {
            reject('error');
        });
        xhr.upload.addEventListener('timeout', (e) => {
            reject('timeout');
        });
        xhr.open('post', 'upload');
        xhr.send(fd);
    });
}

document.querySelector('#tab-download>ul').innerHTML = downloadFiles.map(fname=>{
    return `<li><a href='/file/${fname}'>${fname}</a></li>`;
}).join('\n');