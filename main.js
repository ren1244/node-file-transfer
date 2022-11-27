import { networkInterfaces } from 'os';
import fs from 'fs';
import path from 'path';
import * as url from 'url';
import express from 'express';
import formidable from 'formidable';

//設定
const port = 8000;
const root = 'htdocs'; //網站目錄
const swap = 'files';  //檔案上傳下載區

//常數
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

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
    if (!fs.existsSync(swap)) {
        fs.mkdirSync(swap);
    } else if (!fs.lstatSync(swap).isDirectory()) {
        throw `${swap} 必須是資料夾`;
    }
})();

const app = express();

function responseIndex(res) {
    const filepath = path.resolve(__dirname, root, 'index.html');
    if (!fs.existsSync(filepath)) {
        responseStatus(res, 404);
    } else {
        let content = fs.readFileSync(filepath, { encoding: 'utf-8' });
        let list = fs.readdirSync(swap).filter(f => fs.lstatSync(`${swap}/${f}`).isFile());
        content = content.replace('const downloadFiles = [];', 'const downloadFiles = ' + JSON.stringify(list) + ';');
        res.send(content);
    }
}

function responseStatus(res, code) {
    const t = {
        200: 'OK',
        404: 'Not Found',
        500: 'Internal Server Error',
    };
    res.status(code).send({
        status: code,
        statusText: t[code]
    });
}

//[GET] 根目錄預設為 index.html
app.get('/', (req, res) => {
    responseIndex(res);
});

//[GET] index.html
app.get('/index.html', (req, res) => {
    responseIndex(res);
});

//[GET] /*.html 跟 /*.js 的請求
app.use('/', express.static(root));

//[GET] /file/*
app.get('/file/:filename', (req, res) => {
    const filepath = path.resolve(__dirname, swap, req.params.filename);
    if (!fs.existsSync(filepath)) {
        responseStatus(res, 404);
    } else {
        res.sendFile(filepath);
    }
});

//[POST] /upload  使用者上傳檔案
app.post('/upload', (req, res) => {
    const form = formidable({
        uploadDir: swap,
        filename: (name, ext, part, form) => {
            return part.originalFilename;
        }
    });
    form.parse(req, (err, fields, files) => {
        if (err) {
            responseStatus(res, 500);
        } else {
            responseStatus(res, 200);
        }
    });
});

app.get('*', function (req, res) {
    responseStatus(res, 404);
});

app.listen(port);
