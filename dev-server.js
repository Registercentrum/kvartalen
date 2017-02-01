'use strict';

const express = require('express');
const app = express();
const fs = require('fs');

const port = process.env.DEV_PORT || 3005;
const baseUrl = '';

const codeToNameMap = {
    1274: 'EffectivenessGrid',
    1275: 'IndicatorsForManagement',
    1276: 'IndicatorsForHospital',
    1322: 'IndicatorsForQuarters',
    2378: 'IndicatorsOverTime'
}

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/api/metadata/pages/:pageId', function (req, res) {    
    const pageId = req.params.pageId;
    console.log(` serving widget number ${pageId}, as ${codeToNameMap[pageId]}`);
    fs.readFile(`src/${pageId}.html`, 'utf-8', function (err, htmlFile) {
        if (err)
            return res.status(401).end(err);

        fs.readFile(`src/js/views/${codeToNameMap[pageId]}.js`, 'utf-8', function (err, jsFile) {
            if (err)
                return res.status(401).end(err);
            const result = `${htmlFile}<script>${jsFile}</script>`;
            return res.status(200).end(JSON.stringify({
                data: {
                    PageContent: result,
                    PageID: pageId
                }
            }));
        });
    })
});

app.listen(port, function () {
    console.log(`listening on ${port}, for api calls.`);
})