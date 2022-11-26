import { networkInterfaces } from 'os';
import http from 'http';
import fs from 'fs';
import formidable from 'formidable';

const port = 8000;
const root = 'htdocs'; //網站目錄
const swap = 'files';  //檔案上傳下載區

//偵測網路環境，並顯示網址
(() => {
    let t = networkInterfaces();
    for (let k in t) {
        for (let o of t[k]) {
            if (o.internal === false && o.family === 'IPv4') {
                console.log(`http://${o.address}:${port}`);
                return;
            }
        }
    }
    throw '錯誤: 找不到網路';
})();

//確認 swap 資料夾
(() => {
    if(!fs.existsSync(swap)) {
        fs.mkdirSync(swap);
    } else if(!fs.lstatSync(swap).isDirectory()) {
        throw `${swap} 必須是資料夾`;
    }
})();

function getFileContent(filepath, binaryFlag) {
    let content = binaryFlag ?
        fs.readFileSync(filepath) :
        fs.readFileSync(filepath, { encoding: 'utf-8' });
    if (filepath === `${root}/index.html`) {
        let list = fs.readdirSync(swap).filter(f => fs.lstatSync(`${swap}/${f}`).isFile());
        content = content.replace('const downloadFiles = [];', 'const downloadFiles = ' + JSON.stringify(list) + ';');
    }
    return content;
}

var server = http.createServer(function (req, res) {
    //[GET] 根目錄預設為 index.html
    if (req.method === 'GET' && req.url == '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(getFileContent(`${root}/index.html`));
        res.end();
        return;
    }
    //[GET] *.html 跟 *.js 的請求
    let mch = req.url.match(/\.(html|js)$/);
    if (req.method === 'GET' && mch !== null) {
        const filepath = `${root}${req.url}`;
        if (!fs.existsSync(filepath)) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.write(`<html><body>Not Found.</body></html>`);
            res.end();
        } else {
            res.writeHead(200, { 'Content-Type': mch[1] === 'html' ? 'text/html' : 'text/javascript' });
            res.write(getFileContent(filepath));
            res.end();
        }
        return;
    }
    //[GET] /file/*
    mch = req.url.match(/^\/file\/([\w\W]+)$/);
    if (req.method === 'GET' && mch !== null) {
        const filepath = `${swap}/${decodeURIComponent(mch[1])}`;
        if (!fs.existsSync(filepath)) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.write(`<html><body>Not Found.</body></html>`);
            res.end();
        } else {
            let buf = getFileContent(filepath, true);
            res.writeHead(200, {
                'Content-Type': 'application/octet-stream',
                'Content-Length': buf.length
            });
            res.write(buf);
            res.end();
        }
        return;
    }
    //[POST] 使用者上傳檔案
    if (req.method === 'POST' && req.url === '/upload') {
        const form = formidable({
            uploadDir: swap,
            filename: (name, ext, part, form) => {
                return part.originalFilename;
            }
        });
        form.parse(req, (err, fields, files) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.write(`<html><body>Internal Error</body></html>`);
                res.end();
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write(`<html><body>ok</body></html>`);
            res.end();
        });
        return;
    }
    //都不是
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.write('<html><body>404</body></html>');
    res.end();
});

server.listen(port);
