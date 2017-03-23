window.Stratum = {
    SID: {}
};
window.Stratum.SID = {
    relURL: '',
    initialize: function(widget) {
        this.initializeClasses();
        var aCallback = widget.init;
        if (Ext.isFunction(widget.preInit)) {
            widget.preInit();
        }
        Profile.APIKey = 'bK3H9bwaG4o='; // PROD
        if (Repository.Local.database) {
            aCallback.call(widget, this);
            return;
        }
        // Need to fetch both current year and previous to ensure all quarterly values are retrieved.
        var mrp = this.getMostRecentPeriod();
        var me = this;
        if (!Repository.Local.current) {
            Repository.Local.current = {
                period: mrp.period || 4123, //TODO: set to latest period in database.
                yearOfPeriod: mrp.year || 2012, //TODO: set to latest year in database.
                gender: '3',
                management: '51001',
                hospital: '510011',
                administration: '510011',
                indicator: 1002
            };
        }
        Repository.Local.database = {};
        me.ajaxCall('/api/registrations/form/1077', function(e, r) {
            // Get Target regitrations.
            if (!r.result.success) {
                aCallback.call(widget, me, r.result.message);
            } else {
                Repository.Local.database.Targets = r.result.data;
                me.ajaxCall('/api/registrations/form/1076', function(e, r) {
                    // Get Indicator registrations.
                    if (!r.result.success) {
                        aCallback.call(widget, me, r.result.message);
                    } else {
                        Repository.Local.database.Indicators = r.result.data;
                        me.initDomainMap(function(e, r) {
                            if (r.result && r.result.success) {
                                Ext
                                    .create('Ext.data.Store', {
                                        storeId: 'KVIndicatorStore',
                                        fields: [
                                            {
                                                name: 'valueCode',
                                                mapping: 'ValueCode',
                                                type: 'int'
                                            },
                                            {
                                                name: 'valueName',
                                                mapping: 'ValueName'
                                            },
                                            {
                                                name: 'title',
                                                convert: function(v, record) {
                                                    return me.mapTitleCodeToName(
                                                        record.get('valueCode')
                                                    );
                                                }
                                            },
                                            'Sequence'
                                        ],
                                        proxy: {
                                            type: 'ajax',
                                            url: (
                                                (me.relURL || '') +
                                                    '/api/metadata/domains/4243'
                                            ),
                                            extraParams: (
                                                me.APIKey
                                                    ? {
                                                          APIKey: me.APIKey
                                                      }
                                                    : {}
                                            ),
                                            reader: {
                                                type: 'json',
                                                rootProperty: 'data.DomainValues'
                                            }
                                        },
                                        sorters: [
                                            {
                                                property: 'Sequence',
                                                direction: 'ASC'
                                            }
                                        ],
                                        filters: [
                                            function(item) {
                                                return Ext.Array.contains(
                                                    me.getPossibleIndicators({
                                                        indicatorValues: true
                                                    }),
                                                    item.get('valueCode')
                                                );
                                            }
                                        ],
                                        autoLoad: false
                                    })
                                    .load(function(
                                        records,
                                        operation,
                                        success
                                    ) {
                                        if (success) {
                                            aCallback.call(widget, me);
                                        } else {
                                            aCallback.call(
                                                widget,
                                                me,
                                                'could not load indicators'
                                            );
                                        }
                                    });
                            } else {
                                aCallback.call(widget, me, r.message);
                            }
                        });
                    }
                });
            }
        });
    },
    getMostRecentPeriod: function(date) {
        var d = date || new Date(), periods = [2341, 3412, 4123, 1234];
        d = Ext.Date.add(d, Ext.Date.DAY, -135);
        return {
            period: periods[parseInt(d.getMonth() / 3, 10)],
            year: d.getFullYear()
        };
    },
    getIndicatorTargets: function(anIndicatorCode) {
        var db = Repository.Local.database, me = this.getIndicatorTargets, tc;

        if (!me.cache || !me.cache[anIndicatorCode]) {
            tc = Ext.Array.filter(db.Targets, function(cr) {
                return cr.Indicator === anIndicatorCode;
            });
            tc.sort(function(a, b) {
                return a.YearOfQuarter < b.YearOfQuarter ||
                    a.YearOfQuarter === b.YearOfQuarter &&
                        a.Quarter < b.Quarter;
            });
            me.cache = me.cache || {};
            me.cache[anIndicatorCode] = {
                LimitBelow: tc[0].LimitBelow,
                LimitAbove: tc[0].LimitAbove
            };
        }
        return me.cache[anIndicatorCode];
    },
    getPossibleIndicators: function() {
        var db = Repository.Local.database,
            me = this.getPossibleIndicators,
            mc = {},
            yc = {},
            inds = [];

        if (!me.cache) {
            Ext.Array.forEach(db.Indicators, function(rc) {
                if (!mc[rc.Indicator]) {
                    mc[rc.Indicator] = {
                        valueCode: rc.Indicator,
                        valueName: Repository.Local.Methods.mapIndicatorCodeToName(
                            rc.Indicator
                        )
                    };
                    inds.push(rc.Indicator);
                }
                if (!yc[rc.YearOfPeriod]) {
                    yc[rc.YearOfPeriod] = {
                        valueCode: rc.YearOfPeriod,
                        valueName: rc.YearOfPeriod.toString()
                    };
                }
            });
            me.cache = {
                mc: Ext.Object.getValues(mc),
                yc: Ext.Array.sort(Ext.Object.getValues(yc), function(a, b) {
                    return b.valueCode - a.valueCode;
                }),
                inds: inds
            };
        }
        if (arguments && arguments[0] && arguments[0].indicatorValues) {
            return me.cache.inds;
        }
        return arguments && arguments[0] && arguments[0].years
            ? me.cache.yc
            : me.cache.mc;
    },
    getIndicatorSequence: function(indicatorCode) {
        var store = Ext.StoreManager.lookup('KVIndicatorStore'), record;
        if (!store) {
            return;
        }
        record = store.findRecord('valueCode', indicatorCode);
        return record && record.get('Sequence');
    },
    getPossibleYears: function() {
        return this.getPossibleIndicators({
            years: true
        });
    },
    getAdministrationCodeNamePairs: function() {
        var hospitals = [],
            managements = [],
            _callee = this.getAdministrationCodeNamePairs;

        if (!_callee.cache) {
            if (Repository.Local.domainMaps.hospital) {
                Ext.Object.each(Repository.Local.domainMaps.hospital, function(
                    key,
                    val
                ) {
                    hospitals.push({
                        type: 'hospital',
                        valueName: val,
                        valueCode: parseInt(key, 10)
                    });
                });
            }
            if (Repository.Local.domainMaps.management) {
                Ext.Object.each(
                    Repository.Local.domainMaps.management,
                    function(key, val) {
                        managements.push({
                            type: 'management',
                            valueName: val,
                            valueCode: parseInt(key, 10)
                        });
                    }
                );
            }

            function sortByValueName(a, b) {
                return a.valueName.localeCompare(b.valueName);
            }
            Ext.Array.sort(managements, sortByValueName);
            Ext.Array.sort(hospitals, sortByValueName);
            _callee.cache = Ext.Array.merge(hospitals, managements);
        }
        return _callee.cache;
    },
    getPeriodCodeNamePairs: function() {
        var ret = [], me = this.getPeriodCodeNamePairs;
        if (!me.cache) {
            if (Repository.Local.domainMaps) {
                Ext.Object.each(Repository.Local.domainMaps.periods, function(
                    key,
                    value
                ) {
                    ret.push({
                        valueName: value,
                        valueCode: parseInt(key, 10)
                    });
                });
            }
            me.cache = ret;
        }
        return me.cache;
    },
    maximumOfMeasure: function(aStore) {
        // Calculate maximum of all current measures, deviation included (to support auto scaling of y-axis in charts).
        var max = 0;
        aStore.each(function(o) {
            max = Math.max(
                max,
                Math.ceil(
                    (o.data.measure + o.data.measure / 100 * o.data.deviation) /
                        10
                ) * 10
            );
        });
        return max;
    },
    domainForStore: function(aMapFunction) {
        var o = aMapFunction();
        var l = [];

        Ext.Object.each(o, function(k, v) {
            l.push({
                valueCode: k,
                valueName: v
            });
        });
        return l;
    },
    initDomainMap: function(callback) {
        var me = this,
            domainMaps = {
                management: {},
                hospital: {}
            },
            domainMapIds = {
                Administration: {
                    id: 4244,
                    name: 'Administration'
                },
                Indicator: {
                    id: 4243,
                    name: 'Indikator'
                },
                Period: {
                    id: 4245,
                    name: 'Period'
                },
                Gender: {
                    id: 4247,
                    name: 'Kön' //TODO: Might be a good idea to change to A-Za-z? or consider querying this as a separate domain
                },
                Register: {
                    id: 4248,
                    name: 'Registerursprung'
                },
                Title: {
                    id: 5569,
                    name: 'IndikatorTitel'
                }
            };
        var ids = Ext.Array.pluck(Ext.Object.getValues(domainMapIds), 'id'),
            data;
        me.ajaxCall('/api/metadata/domains/map/' + ids.join(), function(e, r) {
            if (r.result && r.result.success) {
                data = r.result.data;
                Ext.Object.each(
                    data[domainMapIds.Administration.name],
                    function(key, value) {
                        //Separate hospitals from management
                        if (key.length === 5) {
                            domainMaps.management[key] = value;
                        } else {
                            domainMaps.hospital[key] = value;
                        }
                    }
                );
                domainMaps.indicators = data[domainMapIds.Indicator.name];
                domainMaps.gender = data[domainMapIds.Gender.name];
                domainMaps.registers = data[domainMapIds.Register.name];
                domainMaps.periods = data[domainMapIds.Period.name];
                domainMaps.titles = data[domainMapIds.Title.name];
                Repository.Local.domainMaps = domainMaps;
            }
            Ext.isFunction(callback) && callback(e, r);
        });
    },
    ajaxCall: function(url, callbackFn) {
        var me = this;
        Ext.Ajax.request({
            url: (me.relURL || '') + url,
            method: 'GET',
            params: (
                me.APIKey
                    ? {
                          APIKey: me.APIKey
                      }
                    : {}
            ),
            callback: function(o, success, resp) {
                var data;
                if (success) {
                    data = resp &&
                        resp.responseText &&
                        Ext.decode(resp.responseText);
                    // data = data && data.data;
                }
                callbackFn(resp, {
                    result: data
                });
            }
        });
    },
    mapManagementCodeToShortname: function(anAdministrationCode) {
        //TODO: Consider storing this as Domain
        var map = {
            '52012': 'Alingsås', //ALS
            '50000': 'Angered', //ANS
            '50071': 'Frölunda', //FSS
            '51012': 'Kungälv', //KLV
            '50070': 'Capio Lundby', //LUN
            '51013': 'NU', //NU
            '51001': 'Sahlgrenska', //SU
            '53014': 'Skaraborg', //SKAS
            '51014': 'Södra Älvsborg', //SKAS
            '55555': 'VGR'
        };
        return anAdministrationCode ? map[anAdministrationCode] : map;
    },
    mapManagementCodeToName: function(aManagementCode) {
        var map = Repository.Local.domainMaps.management;
        return aManagementCode ? map[aManagementCode] : map;
    },
    mapHospitalCodeToName: function(anAdministrationCode) {
        var map = Repository.Local.domainMaps.hospital;
        return anAdministrationCode ? map[anAdministrationCode] : map;
    },
    mapAdministrationCodeToName: function(aAdministrationCode) {
        if (!aAdministrationCode) return '';
        if (aAdministrationCode.toString().length === 5) {
            return this.mapManagementCodeToName(aAdministrationCode);
        }
        if (aAdministrationCode.toString().length === 6) {
            return this.mapHospitalCodeToName(aAdministrationCode);
        }
    },
    mapRegisterCodeToName: function(aRegisterCode) {
        var map = Repository.Local.domainMaps.registers;
        return Ext.isNumeric(aRegisterCode)
            ? map[aRegisterCode.toString().substr(0, 2)]
            : map;
    },
    mapTitleCodeToName: function(aIndicatorCode) {
        var map = Repository.Local.domainMaps.titles;
        return Ext.isNumeric(aIndicatorCode) ? map[aIndicatorCode] : map;
    },
    mapIndicatorCodeToName: function(anIndicatorCode) {
        var map = Repository.Local.domainMaps.indicators;
        return anIndicatorCode ? map[anIndicatorCode.toString()] : map;
    },
    mapGenderCodeToName: function(aGenderCode) {
        var map = Repository.Local.domainMaps.gender;
        return aGenderCode ? map[aGenderCode.toString()] : map;
    },
    mapPeriodCodeToName: function(aPeriodCode) {
        var map = Repository.Local.domainMaps.periods;
        return aPeriodCode ? map[aPeriodCode.toString()] : map;
    },
    toRegisterCode: function(aIndicatorCode) {
        return +aIndicatorCode.toString().substr(0, 2);
    },
    toManagementCode: function(aHospitalCode) {
        return aHospitalCode.toString().substr(0, 5);
    },
    getErrorPathAttributes: function(
        barSprite,
        barConfig,
        deviation,
        lineConf
    ) {
        var conf = Ext.isObject(lineConf) ? lineConf : {},
            errorWidth = (conf.errorWidth || barConfig.width * 0.5) / 2,
            lineWidth = (conf.lineWidth || 10) / 2,
            barX = barConfig.x + barConfig.width / 2,
            barY = barConfig.y,
            maxHeight = barSprite.attr.innerHeight;
        return {
            path: [
                'M',
                barX,
                barY,
                'V',
                Math.min(maxHeight - lineWidth, barY + deviation - lineWidth), //Line to top bar
                'M',
                barX - errorWidth,
                Math.min(maxHeight - lineWidth, barY + deviation - lineWidth),
                'H',
                errorWidth + barX, //Top error bar
                'M',
                barX,
                barY,
                'V',
                Math.max(barY - deviation + lineWidth, lineWidth),
                'M',
                barX - errorWidth,
                Math.max(barY - deviation + lineWidth, lineWidth),
                'H',
                errorWidth + barX // Bottom error bar
            ],
            stroke: conf.stroke || '#000',
            lineWidth: conf.lineWidth || 2,
            zIndex: conf.zIndex || 10000
        };
    },
    // Draws three rectangles onto the chart surface describing the current limits.
    // Currently only working for 0-100 scales...
    drawLimitRectangles: function(chart) {
        var store = chart.getStore(),
            series = chart.getSeries() && chart.getSeries()[0],
            surface = series && series.getSurface(),
            first,
            limitAbove,
            limitBelow,
            maxWidth,
            maxHeight,
            topLimit,
            lowerLimit,
            scale,
            rectConfig,
            i,
            rectSprites,
            rectSprite;

        if (!surface || !surface.getRect()) {
            Ext.log({
                msg: 'Could not find rendered surface',
                level: 'error'
            });
            return;
        }
        rectSprites = surface.rectSprites;

        maxWidth = surface.getRect()[2];
        maxHeight = surface.getRect()[3];
        if (!store || store.count() <= 0) {
            if (rectSprites && rectSprites.length === 3) {
                for (i = 0; i < 3; i++) {
                    rectSprites[i].hide();
                }
            }
            surface.renderFrame();
            return;
        }
        first = store.first();
        limitAbove = first.get('limitAbove');
        limitBelow = first.get('limitBelow');
        topLimit = Math.max(limitAbove, limitBelow);
        lowerLimit = Math.min(limitAbove, limitBelow);
        // console.log('limitAbove: %i, limitBelow: %i, maxHeight: %i', limitAbove, limitBelow, maxHeight);
        scale = maxHeight / 100;
        rectConfig = [
            {
                height: (maxHeight - topLimit) * scale,
                y: topLimit * scale,
                fillStyle: limitAbove >= limitBelow ? '#CCD273' : '#F3BB73'
            },
            {
                height: (topLimit - lowerLimit) * scale,
                y: lowerLimit * scale,
                fillStyle: '#FEE273'
            },
            {
                height: lowerLimit * scale,
                y: 0,
                fillStyle: limitAbove >= limitBelow ? '#F3BB73' : '#CCD273'
            }
        ];
        //Add rectangles for limits
        if (!rectSprites) {
            rectSprites = surface.rectSprites = [];
        }
        for (i = 0; i < 3; i++) {
            rectSprite = rectSprites[i];
            if (!rectSprite) {
                rectSprite = rectSprites[i] = surface.add({
                    type: 'rect'
                });
            } else {
                rectSprite.show();
            }
            rectSprite.setAttributes({
                y: rectConfig[i].y,
                width: maxWidth,
                height: rectConfig[i].height,
                fillStyle: rectConfig[i].fillStyle,
                zIndex: 1000
            });
        }
        surface.renderFrame();
    },
    kvartalenChartRenderer: function(deviationKeys) {
        return function(sprite, config, rendererData, index) {
            var me = Repository.Local.Methods,
                store = rendererData.store,
                storeItems = store.getData().items,
                last = storeItems.length - 1,
                record = storeItems[index],
                surface = sprite.getParent(),
                errorSprites = surface.myErrorSprites,
                spriteSlot,
                maxWidth,
                maxHeight,
                scale = sprite.attr.scalingY,
                deviation,
                errorSprite,
                i,
                j,
                field = sprite.getField(),
                dataValue,
                textSprite = surface.textSprite;
            textSprite && textSprite.hide();

            maxWidth = surface.getRect()[2];
            maxHeight = surface.getRect()[3];
            if (!store || store.count() <= 0 || !record) {
                // Hides all sprites if there are no records... And adds a text sprite
                if (errorSprites && !surface.mySpritesHidden) {
                    Ext.each(errorSprites, function(esSlot) {
                        Ext.Object.each(esSlot, function(es) {
                            esSlot[es].hide();
                        });
                    });
                    surface.mySpritesHidden = true;
                }
                if (!textSprite) {
                    textSprite = surface.textSprite = surface.add({
                        type: 'text',
                        x: maxWidth / 2,
                        y: maxHeight / 2,
                        'font-size': '18px',
                        text: 'Data saknas för aktuellt urval.',
                        fontSize: 20,
                        zIndex: 10000,
                        opacity: 0.6,
                        scalingY: -1,
                        textAlign: 'center',
                        fillStyle: '#000'
                    });
                } else {
                    textSprite.show();
                }
                return;
            }

            surface.mySpritesHidden = false;
            dataValue = record.get(field);
            deviation = (deviationKeys
                ? record.get(deviationKeys[field])
                : record.get('deviation')) * scale;

            if (!errorSprites) {
                errorSprites = surface.myErrorSprites = [];
            }

            spriteSlot = errorSprites[index]
                ? errorSprites[index]
                : errorSprites[index] = {};
            errorSprite = spriteSlot[field]
                ? spriteSlot[field]
                : spriteSlot[field] = surface.add({
                      type: 'path',
                      parent: sprite
                  });

            var attr = me.getErrorPathAttributes(sprite, config, deviation);
            errorSprite.setAttributes(attr);
            errorSprite.show();

            if (dataValue === null || dataValue === 0) {
                errorSprite.hide();
            }

            if (index === last) {
                for (i = last + 1; i < errorSprites.length; i++) {
                    for (j in errorSprites[i]) {
                        errorSprites[i][j].hide();
                    }
                }
            }
            //Adjust width
            return {
                width: config.width / 1.25,
                x: config.x + (config.width - config.width / 1.25) / 2
            };
        };
    },
    drawTableOnCanvas: function(ctx, items, renderer) {
        if (!Array.isArray(items)) {
            throw new Error('Expected an array');
        }
        ctx.fillStyle = '#000000';
        var totalWidth = Math.ceil(
            Ext.Array.sum(
                Ext.Array.map(items, function(item) {
                    return item.width;
                })
            ) +
                (items.length - 1) * 2
        );
        var maxHeight = Math.ceil(
            Ext.Array.max(
                Ext.Array.map(items, function(item) {
                    return item.height;
                })
            )
        );
        var top = Math.floor(
            Ext.Array.min(
                Ext.Array.map(items, function(item) {
                    return item.y;
                })
            )
        );
        ctx.beginPath();
        ctx.moveTo(items[0].x, top);
        ctx.lineTo(totalWidth, top);
        ctx.lineTo(totalWidth, top + maxHeight);
        ctx.lineTo(items[0].x, top + maxHeight);
        ctx.lineTo(items[0].x, top);

        for (var i = 0; i < items.length; i++) {
            var curr = items[i];
            var xCord = Math.ceil(curr.x);
            ctx.moveTo(xCord, top);
            ctx.lineTo(xCord, top + maxHeight);
        }
        ctx.closePath();
        ctx.stroke();
        for (var j = 0; j < items.length; j++) {
            renderer(ctx, items[j]);
        }
    },
    drawTextFitted: function(ctx, item, text) {
        if (typeof text !== 'string' && !Array.isArray(text)) {
            throw new Error('cannot call drawTextFitted with this item');
        }
        if (typeof text === 'string') {
            text = text.replace('&shy;', '-');
            text = text.split(/\s|\-/);
        }
        var rowsThatfit = item.height / text.length;
        var textHeight = +ctx.font.match(/(\d+)/)[0] + 2;
        // ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        Ext.Array.each(text, function(t, i) {
            ctx.fillText(
                t,
                item.x + 5,
                item.y + textHeight * i + textHeight + 5,
                item.width - 10
            );
        });
    },
    heatMapToPictures: function(data, config) {
        var me = this,
            width = 1920,
            height = 1080,
            // analys data in,
            rows = data.items,
            len = rows.length,
            mapMngmntCode = me.mapManagementCodeToName;

        function getIndicatorTitle(indicator) {
            return {
                title: me.mapTitleCodeToName(indicator),
                subTitle: me.mapIndicatorCodeToName(indicator)
            };
        }

        var management = Ext.Object
            .getKeys(mapMngmntCode() || {})
            .sort(function(codeA, codeB) {
                return mapMngmntCode(codeA).localeCompare(mapMngmntCode(codeB));
            });

        // divide width into 33 / 66
        var indColWidth = (width - config.padding) * 0.3,
            // 66 / management.length
            heatMapColDimension = (width - config.padding * 2) *
                0.70 /
                management.length,
            pageTopYCord = config.margins.top,
            maxPageHeight = height -
                config.margins.top -
                config.margins.bottom -
                config.padding * 2;
        // the full drawable space - the titlerow(hmcd / 2) / the height of each cell.
        var dataRowsPPage = Math.floor(
            (maxPageHeight - heatMapColDimension / 2) /
                (heatMapColDimension + 2)
        );
        // make title row
        // initilize the title row with the "Indikator" cell
        var titleRow = [
            {
                x: config.padding,
                y: pageTopYCord,
                width: indColWidth,
                height: heatMapColDimension / 2,
                data: 'Indikator'
            }
        ].concat(
            management.map(function(m, i) {
                var x = config.padding + indColWidth + heatMapColDimension * i;
                return {
                    y: pageTopYCord,
                    x: x,
                    width: heatMapColDimension,
                    height: heatMapColDimension / 2,
                    data: me.mapManagementCodeToName(m)
                };
            })
        );

        // get the datarows.. todo: clean up argument list..
        function getDataRows(
            start,
            end,
            dataRowInitalY,
            config,
            indColWidth,
            heatMapColDimension,
            management
        ) {
            var rowSelection = rows.slice(start, end);
            return rowSelection.map(function(rowdata, r) {
                var indicator = rowdata.get('indicator');
                var nonRegistration = rowdata.get('hasNonRegistering');
                var titles = getIndicatorTitle(indicator);
                var rowY = dataRowInitalY + heatMapColDimension * r;
                return [
                    {
                        x: config.padding,
                        y: rowY,
                        width: indColWidth,
                        height: heatMapColDimension,
                        data: [titles.title, titles.subTitle]
                    }
                ].concat(
                    management.map(function(m, i) {
                        var x = config.padding +
                            indColWidth +
                            heatMapColDimension * i;
                        return {
                            y: rowY,
                            x: x,
                            width: heatMapColDimension,
                            height: heatMapColDimension,
                            data: rowdata.get('m' + m)
                        };
                    })
                );
            });
        }

        function printPage(titleRow, dataRows, header, footer) {
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var context = canvas.getContext('2d');
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, width, height);
            me.drawTableOnCanvas(context, titleRow, function(ctx, item) {
                ctx.font = ctx.font.replace(/(\d*)/, 16);
                me.drawTextFitted(ctx, item, item.data);
            });

            // draw the data rows..
            for (var d = 0; d < dataRows.length; d++) {
                var datarow = dataRows[d];
                me.drawTableOnCanvas(context, datarow, function(ctx, item) {
                    if (!item.data) {
                        ctx.fillStyle = config.colors.na;
                        ctx.fillRect(
                            item.x + 2,
                            item.y + 2,
                            item.width - 4,
                            item.height - 4
                        );
                    } else if (Array.isArray(item.data)) {
                        ctx.fillStyle = '#000000';
                        ctx.font = ctx.font.replace(/(\d*)/, 18);
                        me.drawTextFitted(ctx, item, item.data);
                    } else if (item.data.Indicator) {
                        var t = me.getIndicatorTargets(item.data.Indicator);
                        var calcs = config.calcFunc(item.data, t);
                        ctx.fillStyle = config.colors[calcs.tdCls];
                        ctx.fillRect(
                            item.x + 2,
                            item.y + 2,
                            item.width - 4,
                            item.height - 4
                        );
                        ctx.fillStyle = '#000000';
                        var n = 'n = ' + item.data.Size;
                        var m = 'm = ' +
                            Ext.util.Format.number(t.LimitAbove, '0.0%');
                        me.drawTextFitted(ctx, item, [n, m]);
                    }
                });
            }

            // draw the header
            me.drawTextFitted(context, header, header.data);

            //draw the footer
            context.font = context.font.replace(/(\d*)/, footer.size);
            var footerW = context.measureText(footer.text).width;
            var footerX = width - config.padding - footerW;
            var footerY = height - config.margins.bottom + footer.size + 2;
            context.fillText(footer.text, footerX, footerY);
            
            if (canvas.msToBlob) {
                return canvas.msToBlob();
            }
            return canvas.toDataURL();
        }

        var pages = Math.ceil(rows.length / dataRowsPPage);
        var header = {
            y: config.padding,
            x: config.padding,
            width: width,
            height: config.margins.top,
            data: config.header
        };
        var footer = {
            size: 14,
            text: '* n = observationer, m = måltal.'
        };
        var result = [];
        for (var p = 0; p < pages; p++) {
            var start = p * dataRowsPPage;
            var end = start + dataRowsPPage;
            var dataRowInitalY = titleRow[0].y + titleRow[0].height;
            var currentDataRows = getDataRows(
                start,
                end,
                dataRowInitalY,
                config,
                indColWidth,
                heatMapColDimension,
                management
            );
            result.push(printPage(titleRow, currentDataRows, header, footer));
        }

        // return array of dataUri's
        return result;
    },
    navigateToPage: function(pageId) {
        if (typeof location === 'undefined' || !location) {
            return;
        }
        location.hash = '#!page?id=' + pageId;
    },
    initializeClasses: function() {
        var EXPORT_CHART_NAME = 'RC.ui.ExportChart';
        // this class is a rough implmentation and should be improved upon.
        !Ext.ClassManager.isCreated(EXPORT_CHART_NAME) &&
            Ext.define(EXPORT_CHART_NAME, function() {
                function getChartSideGap(chart, side) {
                    return chart.insetPadding[side] +
                        chart
                            .getAxes()
                            .filter(function(ax) {
                                return ax.getPosition() === side;
                            })
                            .reduce(
                                function(prev, curr) {
                                    return prev + curr.getThickness
                                        ? curr.getThickness()
                                        : 0;
                                },
                                0
                            );
                }

                var defaultConfig = {
                    padding: 10,
                    header: {
                        font: {
                            size: '16px',
                            family: 'cartogothic_stdregular,open_sans,helvetica,arial,sans-serif'
                        },
                        height: 0
                    },
                    table: {
                        height: 0,
                        font: {
                            size: '10px',
                            family: 'cartogothic_stdregular,open_sans,helvetica,arial,sans-serif'
                        }
                    },
                    footer: {
                        height: 0,
                        font: {
                            size: '10px',
                            family: 'cartogothic_stdregular,open_sans,helvetica,arial,sans-serif'
                        }
                    }
                };

                function compositeFont(fontConfig) {
                    return fontConfig.size + ' ' + fontConfig.family;
                }

                function defaultTableRenderer(ctx, config, keys, data) {
                    var len = data.length;
                    var dataCellWidth = (config.width -
                        config.padLeft -
                        config.padRight -
                        config.padding * 2) /
                        len;

                    var width = dataCellWidth * len +
                        config.padLeft +
                        config.padding;

                    var leftEdge = Math.floor(config.padding / 2);
                    // debugger;
                    var tblTop = config.height;
                    var tblHeight = 22;
                    for (var k = 0; k < keys.length; k++) {
                        ctx.beginPath();
                        // move to left top corner
                        ctx.moveTo(leftEdge, tblTop);
                        // draw to right top corner
                        ctx.lineTo(width, tblTop);
                        // move to right bottom corner
                        ctx.moveTo(width, tblTop + tblHeight);
                        // draw to left bottom corner
                        ctx.lineTo(leftEdge, tblTop + tblHeight);
                        // draw to left top corner
                        ctx.lineTo(leftEdge, tblTop);

                        for (var i = 0; i < len + 1; i++) {
                            var yCord = config.padLeft + dataCellWidth * i;
                            ctx.moveTo(yCord + 5, tblTop); // 5 is a magic number.. :P
                            ctx.lineTo(yCord + 5, tblTop + tblHeight);
                        }
                        ctx.closePath();
                        ctx.stroke();

                        // ctx.font = '10px cartogothic_stdregular,open_sans,helvetica,arial,sans-serif';
                        var txtbtmXCord = tblTop + tblHeight / 2 + 3;
                        ctx.fillText(keys[k].title, 4, txtbtmXCord);

                        for (var i = 0; i < len; i++) {
                            var value = keys[k].key
                                ? data.items[i].get(keys[k].key)
                                : '';
                            var textHalfWdth = ctx.measureText &&
                                ctx.measureText(value).width / 2 ||
                                0;
                            var yCord = config.padLeft +
                                dataCellWidth * i +
                                dataCellWidth / 2 -
                                textHalfWdth;

                            ctx.fillText(
                                value,
                                yCord + config.padding,
                                txtbtmXCord
                            );
                        }
                        tblTop = tblTop + tblHeight;
                    }
                }

                function drawSection(ctx, config, type, dimensions, chart) {
                    var section = config[type];
                    ctx.font = compositeFont(section.font);
                    ctx.fillStyle = config.foreColor || 'black';
                    // get the font size without the 'px|pt' and add 2 pixels for lineheight
                    var lineHeight = +section.font.size.match(/(\d+)/)[0] + 2;
                    if (
                        section.items &&
                        Array.isArray(section.items) &&
                        section.items.length
                    ) {
                        section.items.forEach(function(item, index) {
                            var currentLineHeight = lineHeight * (index + 1) +
                                config.padding;
                            if (typeof item === 'string') {
                                ctx.fillStyle = config.foreColor || 'black';
                                ctx.fillText(
                                    item,
                                    config.padding,
                                    currentLineHeight
                                );
                            } else if (typeof item === 'object' && item.text) {
                                ctx.fillStyle = config.foreColor || 'black';
                                ctx.fillText(
                                    item.text,
                                    config.padding,
                                    currentLineHeight
                                );
                                if (
                                    item.renderer &&
                                    typeof item.renderer === 'function'
                                ) {
                                    item.renderer(ctx, {
                                        lineHeight: lineHeight,
                                        row: index
                                    });
                                }
                            }
                        });
                    }
                    if (typeof section.renderer === 'function') {
                        section.renderer(ctx, dimensions);
                    }
                    if (type == 'table' && section.keys) {
                        defaultTableRenderer(
                            ctx,
                            dimensions,
                            section.keys,
                            chart.getStore().getData()
                        );
                    }
                }

                return {
                    generatePicture: function(config) {
                        var chart = this,
                            chartHeight = chart.getHeight(),
                            chartWidth = chart.getWidth(),
                            chartImage = chart.getImage('image'),
                            chartLeftWidth = getChartSideGap(chart, 'left'),
                            chartRighWidth = getChartSideGap(chart, 'right'),
                            chartBottomHeight = getChartSideGap(
                                chart,
                                'bottom'
                            );
                        cnvs = document.createElement('canvas');
                        config = Ext.merge({}, defaultConfig, config || {});

                        var pictureWidth = chartWidth + config.padding;
                        var pictureHeight = chartHeight +
                            config.header.height +
                            config.table.height +
                            config.footer.height;

                        cnvs.width = pictureWidth;
                        cnvs.height = pictureHeight;

                        var ctx = cnvs.getContext('2d');
                        ctx.globalAlpha = 1;
                        // setTimeout(function() {

                        // });

                        ctx.fillStyle = config.backColor || 'white';
                        ctx.fillRect(0, 0, pictureWidth, pictureHeight);

                        // debugger;
                        var chartImageX = config.padding /2;
                        var chartImageY = config.header.height;
                        // chartImage.data.width = chartWidth;
                        // chartImage.data.height = chartHeight;
                        ctx.drawImage(chartImage.data, chartImageX, chartImageY, chartWidth, chartHeight);

                        

                        drawSection(ctx, config, 'header');
                        drawSection(
                            ctx,
                            config,
                            'table',
                            {
                                height: chartHeight + config.header.height,
                                width: pictureWidth,
                                padLeft: chartLeftWidth,
                                padRight: chartRighWidth,
                                padding: config.padding / 2
                            },
                            chart
                        );  
                        var returnVal;
                        if (cnvs.msToBlob) {
                            return cnvs.msToBlob();
                        }
                        return cnvs.toDataURL();
                    },
                    alias: 'widget.exportChart',
                    extend: 'Ext.chart.Chart',
                    constructor: function(config) {
                        this.callParent(arguments);
                    }
                };
            });
    }
};
