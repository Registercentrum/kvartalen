window.Stratum = {
    SID: {}
};
window.Stratum.SID = {
    relURL: '',
    initialize: function (widget) {
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
        me.ajaxCall('/api/registrations/form/1077', function (e, r) { // Get Target regitrations.
            if (!r.result.success) {
                aCallback.call(widget, me, r.result.message);
            } else {
                Repository.Local.database.Targets = r.result.data;
                me.ajaxCall('/api/registrations/form/1076', function (e, r) { // Get Indicator registrations.
                    if (!r.result.success) {
                        aCallback.call(widget, me, r.result.message);
                    } else {
                        Repository.Local.database.Indicators = r.result.data;
                        me.initDomainMap(function (e, r) {
                            if (r.result && r.result.success) {
                                Ext.create('Ext.data.Store', {
                                    storeId: 'KVIndicatorStore',
                                    fields: [{
                                        name: 'valueCode',
                                        mapping: 'ValueCode',
                                        type: 'int'
                                    }, {
                                        name: 'valueName',
                                        mapping: 'ValueName'
                                    }, {
                                        name: 'title',
                                        convert: function (v, record) {
                                            return me.mapTitleCodeToName(record.get('valueCode'));
                                        }
                                    }, 'Sequence'],
                                    proxy: {
                                        type: 'ajax',
                                        url: (me.relURL || '') + '/api/metadata/domains/4243',
                                        extraParams: me.APIKey ? {
                                            APIKey: me.APIKey
                                        } : {},
                                        reader: {
                                            type: 'json',
                                            rootProperty: 'data.DomainValues'
                                        }
                                    },
                                    sorters: [{
                                        property: 'Sequence',
                                        direction: 'ASC'
                                    }],
                                    filters: [

                                        function (item) {
                                            return Ext.Array.contains(me.getPossibleIndicators({
                                                indicatorValues: true
                                            }), item.get('valueCode'));
                                        }
                                    ],
                                    autoLoad: false
                                }).load(function (records, operation, success) {
                                    if (success) {
                                        aCallback.call(widget, me);
                                    } else {
                                        aCallback.call(widget, me, 'could not load indicators');
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
    getMostRecentPeriod: function (date) {
        var d = date || new Date(),
            periods = [2341, 3412, 4123, 1234];
        d = Ext.Date.add(d, Ext.Date.DAY, -135);
        return {
            period: periods[parseInt(d.getMonth() / 3, 10)],
            year: d.getFullYear()
        };
    },
    getIndicatorTargets: function (anIndicatorCode) {
        var db = Repository.Local.database,
            me = this.getIndicatorTargets,
            tc;

        if (!me.cache || !me.cache[anIndicatorCode]) {
            tc = Ext.Array.filter(db.Targets, function (cr) {
                return cr.Indicator === anIndicatorCode;
            });
            tc.sort(function (a, b) {
                return a.YearOfQuarter < b.YearOfQuarter || (a.YearOfQuarter === b.YearOfQuarter && a.Quarter < b.Quarter);
            });
            me.cache = me.cache || {};
            me.cache[anIndicatorCode] = {
                LimitBelow: tc[0].LimitBelow,
                LimitAbove: tc[0].LimitAbove
            };
        }
        return me.cache[anIndicatorCode];
    },
    getPossibleIndicators: function () {
        var db = Repository.Local.database,
            me = this.getPossibleIndicators,
            mc = {},
            yc = {},
            inds = [];

        if (!me.cache) {
            Ext.Array.forEach(db.Indicators, function (rc) {
                if (!mc[rc.Indicator]) {
                    mc[rc.Indicator] = {
                        valueCode: rc.Indicator,
                        valueName: Repository.Local.Methods.mapIndicatorCodeToName(rc.Indicator)
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
                yc: Ext.Array.sort(Ext.Object.getValues(yc), function (a, b) {
                    return b.valueCode - a.valueCode;
                }),
                inds: inds
            };
        }
        if (arguments && arguments[0] && arguments[0].indicatorValues) {
            return me.cache.inds;
        }
        return arguments && arguments[0] && arguments[0].years ? me.cache.yc : me.cache.mc;
    },
    getIndicatorSequence: function (indicatorCode) {
        var store = Ext.StoreManager.lookup('KVIndicatorStore'),
            record;
        if (!store) {
            return;
        }
        record = store.findRecord('valueCode', indicatorCode);
        return record && record.get('Sequence');
    },
    getPossibleYears: function () {
        return this.getPossibleIndicators({
            years: true
        });
    },
    getAdministrationCodeNamePairs: function () {
        var ret = [];
        var _callee = this.getAdministrationCodeNamePairs;
        if (!_callee.cache) {
            if (Repository.Local.domainMaps.hospital) {
                Ext.Object.each(Repository.Local.domainMaps.hospital, function (key, val) {
                    ret.push({
                        type: 'hospital',
                        valueName: val,
                        valueCode: parseInt(key, 10)
                    });
                });
            }
            if (Repository.Local.domainMaps.management) {
                Ext.Object.each(Repository.Local.domainMaps.management, function (key, val) {
                    ret.push({
                        type: 'management',
                        valueName: val,
                        valueCode: parseInt(key, 10)
                    });
                });
            }
            _callee.cache = ret;
        }
        return _callee.cache;
    },
    getPeriodCodeNamePairs: function () {
        var ret = [],
            me = this.getPeriodCodeNamePairs;
        if (!me.cache) {
            if (Repository.Local.domainMaps) {
                Ext.Object.each(Repository.Local.domainMaps.periods, function (key, value) {
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
    maximumOfMeasure: function (aStore) {
        // Calculate maximum of all current measures, deviation included (to support auto scaling of y-axis in charts).
        var max = 0;
        aStore.each(function (o) {
            max = Math.max(max, Math.ceil((o.data.measure + (o.data.measure / 100 * o.data.deviation)) / 10) * 10);
        });
        return max;
    },
    domainForStore: function (aMapFunction) {
        var o = aMapFunction();
        var l = [];

        Ext.Object.each(o, function (k, v) {
            l.push({
                valueCode: k,
                valueName: v
            });
        });
        return l;

    },
    initDomainMap: function (callback) {
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
        me.ajaxCall('/api/metadata/domains/map/' + ids.join(), function (e, r) {
            if (r.result && r.result.success) {
                data = r.result.data;
                Ext.Object.each(data[domainMapIds.Administration.name], function (key, value) {
                    //Separate hospitals from management
                    if (key.length === 5) {
                        domainMaps.management[key] = value;
                    } else {
                        domainMaps.hospital[key] = value;
                    }
                });
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
    ajaxCall: function (url, callbackFn) {
        var me = this;
        Ext.Ajax.request({
            url: (me.relURL || '') + url,
            method: 'GET',
            params: me.APIKey ? {
                APIKey: me.APIKey
            } : {},
            callback: function (o, success, resp) {
                var data;
                if (success) {
                    data = resp && resp.responseText && Ext.decode(resp.responseText);
                    // data = data && data.data;
                }
                callbackFn(resp, {
                    result: data
                });
            }
        });
    },
    mapManagementCodeToShortname: function (anAdministrationCode) {
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
    mapManagementCodeToName: function (aManagementCode) {
        var map = Repository.Local.domainMaps.management;
        return aManagementCode ? map[aManagementCode] : map;
    },
    mapHospitalCodeToName: function (anAdministrationCode) {
        var map = Repository.Local.domainMaps.hospital;
        return anAdministrationCode ? map[anAdministrationCode] : map;
    },
    mapAdministrationCodeToName: function (aAdministrationCode) {
        if (!aAdministrationCode)
            return '';
        if (aAdministrationCode.toString().length === 5) {
            return this.mapManagementCodeToName(aAdministrationCode);
        }
        if (aAdministrationCode.toString().length === 6) {
            return this.mapHospitalCodeToName(aAdministrationCode);
        }
    },
    mapRegisterCodeToName: function (aRegisterCode) {
        var map = Repository.Local.domainMaps.registers;
        return Ext.isNumeric(aRegisterCode) ? map[aRegisterCode.toString().substr(0, 2)] : map;
    },
    mapTitleCodeToName: function (aIndicatorCode) {
        var map = Repository.Local.domainMaps.titles;
        return Ext.isNumeric(aIndicatorCode) ? map[aIndicatorCode] : map;
    },
    mapIndicatorCodeToName: function (anIndicatorCode) {
        var map = Repository.Local.domainMaps.indicators;
        return anIndicatorCode ? map[anIndicatorCode.toString()] : map;
    },
    mapGenderCodeToName: function (aGenderCode) {
        var map = Repository.Local.domainMaps.gender;
        return aGenderCode ? map[aGenderCode.toString()] : map;
    },
    toRegisterCode: function (aIndicatorCode) {
        return +(aIndicatorCode.toString().substr(0, 2));
    },
    toManagementCode: function (aHospitalCode) {
        return aHospitalCode.toString().substr(0, 5);
    },
    getErrorPathAttributes: function (barSprite, barConfig, deviation, lineConf) {

        var conf = Ext.isObject(lineConf) ? lineConf : {},
            errorWidth = (conf.errorWidth || barConfig.width * 0.5) / 2,
            lineWidth = (conf.lineWidth || 10) / 2,
            barX = barConfig.x + barConfig.width / 2,
            barY = barConfig.y,
            maxHeight = barSprite.attr.innerHeight;
        return {
            path: [
                'M', barX, barY,
                'V', Math.min(maxHeight - lineWidth, barY + deviation - lineWidth), //Line to top bar
                'M', barX - errorWidth, Math.min(maxHeight - lineWidth, barY + deviation - lineWidth),
                'H', errorWidth + barX, //Top error bar
                'M', barX, barY,
                'V', Math.max(barY - deviation + lineWidth, lineWidth),
                'M', barX - errorWidth, Math.max(barY - deviation + lineWidth, lineWidth),
                'H', errorWidth + barX // Bottom error bar
            ],
            stroke: conf.stroke || '#000',
            lineWidth: conf.lineWidth || 2,
            zIndex: conf.zIndex || 10000
        };
    },
    // Draws three rectangles onto the chart surface describing the current limits.
    // Currently only working for 0-100 scales...
    // TODO: extract the textSprite addition for use without limit rects.
    drawLimitRectangles: function (chart) {
        var store = chart.getStore(),
            series = chart.getSeries() && chart.getSeries()[0],
            surface = series && series.getSurface(),
            first, limitAbove, limitBelow, maxWidth, maxHeight,
            topLimit, lowerLimit, scale, rectConfig, i,
            rectSprites, rectSprite, textSprite;

        if (!surface || !surface.getRect()) {
            Ext.log({
                msg: 'Could not find rendered surface',
                level: 'error'
            });
            return;
        }
        rectSprites = surface.rectSprites;
        textSprite = surface.textSprite;
        maxWidth = surface.getRect()[2];
        maxHeight = surface.getRect()[3];
        if (!store || store.count() <= 0) {
            if (rectSprites && rectSprites.length === 3) {
                for (i = 0; i < 3; i++) {
                    rectSprites[i].hide();
                }
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
            surface.renderFrame();
            return;
        }
        textSprite && textSprite.hide();
        first = store.first();
        limitAbove = first.get('limitAbove');
        limitBelow = first.get('limitBelow');
        topLimit = Math.max(limitAbove, limitBelow);
        lowerLimit = Math.min(limitAbove, limitBelow);
        // console.log('limitAbove: %i, limitBelow: %i, maxHeight: %i', limitAbove, limitBelow, maxHeight);
        scale = maxHeight / 100;
        rectConfig = [{
            height: (maxHeight - topLimit) * scale,
            y: topLimit * scale,
            fillStyle: limitAbove >= limitBelow ? '#CCD273' : '#F3BB73'
        }, {
            height: (topLimit - lowerLimit) * scale,
            y: lowerLimit * scale,
            fillStyle: '#FEE273'
        }, {
            height: lowerLimit * scale,
            y: 0,
            fillStyle: limitAbove >= limitBelow ? '#F3BB73' : '#CCD273'
        }];
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
    kvartalenChartRenderer: function (deviationKeys) {
        return function (sprite, config, rendererData, index) {
            var me = Repository.Local.Methods,
                store = rendererData.store,
                storeItems = store.getData().items,
                last = storeItems.length - 1,
                record = storeItems[index],
                surface = sprite.getParent(),
                errorSprites = surface.myErrorSprites,
                spriteSlot,
                scale = sprite.attr.scalingY,
                deviation, errorSprite, i, j,
                field = sprite.getField(),
                dataValue;

            if (!record) {
                // Hides all sprites if there are no records... And adds a text sprite
                if (errorSprites && !surface.mySpritesHidden) {
                    Ext.each(errorSprites, function (esSlot) {
                        Ext.Object.each(esSlot, function (es) {
                            esSlot[es].hide();
                        });
                    });
                    surface.mySpritesHidden = true;
                }
                return;
            }

            surface.mySpritesHidden = false;

            dataValue = record.get(field);
            deviation = (deviationKeys ? record.get(deviationKeys[field]) : record.get('deviation')) * scale;

            if (!errorSprites) {
                errorSprites = surface.myErrorSprites = [];
            }

            spriteSlot = errorSprites[index] ? errorSprites[index] : errorSprites[index] = {};
            errorSprite = spriteSlot[field] ? spriteSlot[field] : spriteSlot[field] = surface.add({
                type: 'path',
                parent: sprite
            });
            
            // Ext.Object.each(spriteSlot, function (es) {
            //     spriteSlot[es].hide();
            // });
            var attr = me.getErrorPathAttributes(sprite, config, deviation);
            errorSprite.setAttributes(attr);
            errorSprite.show();

            // if (dataValue !== null && dataValue !== 0 && spriteSlot[field] === errorSprite) {
            //     errorSprite.show();
            // }

            if (dataValue === null || dataValue === 0) {
                errorSprite.hide();
            }
            // sprite.addListener('render', function() {
            //     console.log('changing');
            //     console.dir(this);
            // }, errorSprite);


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
    navigateToPage: function (pageId) {
        if (typeof location === 'undefined' || !location) {
            return;
        }
        location.hash = '#!page?id=' + pageId;
    }
};