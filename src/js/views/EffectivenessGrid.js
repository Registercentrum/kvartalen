Repository.Local.Methods.initialize({
    delayedAffixFn: new Ext.util.DelayedTask(function(grid, headerEl, $doc) {
        if (!grid || !headerEl || !$doc || !headerEl.isVisible()) {
            return;
        }
        if (headerEl.getWidth()) {
            headerEl.setY(
                Math.max(Ext.getBody().getScrollTop(), grid.getBox().y)
            );
        }
    }),
    initHeaderAffix: function(grid) {
        var widget = this,
            headerEl = grid.headerCt.getEl(),
            $doc = Ext.isIE8m ? Ext.getWin() : Ext.getDoc();
        if (Repository.Local.current.affixFn) {
            $doc.un('scroll', Repository.Local.current.affixFn);
        }
        Repository.Local.current.affixFn = function() {
            widget.delayedAffixFn.delay(10, null, this, [grid, headerEl, $doc]);
        };
        $doc.on('scroll', Repository.Local.current.affixFn);
    },
    getEffectivenessFields: function() {
        var arr = [
            {
                name: 'register',
                type: 'int',
                useNull: true
            },
            {
                name: 'indicator',
                type: 'int',
                useNull: true
            },
            {
                name: 'sequence',
                type: 'int'
            },
            {
                name: 'hasNonRegistering',
                type: 'string'
            }
        ],
            management = Repository.Local.Methods.mapManagementCodeToName();
        Ext.Object.each(management || {}, function(code) {
            arr.push({
                name: 'm' + code,
                useNull: true
            });
        });
        return arr;
    },
    getEffectivenessValues: function() {
        var pc = Repository.Local.current.period,
            yc = Repository.Local.current.yearOfPeriod,
            gc = parseInt(Repository.Local.current.gender, 10),
            db = Repository.Local.database,
            ev = {}; // Contains items on the form {'1001': { register: 11, indicator: 1001, m53014: {IndicatorModel}, m51001: {IndicatorModel}, ... }, ...}

        Ext.Array.forEach(db.Indicators, function(rc) {
            var is = rc.Indicator.toString();

            if (
                rc.Period === pc &&
                rc.YearOfPeriod === yc &&
                rc.Gender === gc &&
                rc.Administration.length === 5
            ) {
                if (!ev[is]) {
                    ev[is] = {
                        register: Repository.Local.Methods.toRegisterCode(
                            rc.Indicator
                        ),
                        indicator: rc.Indicator,
                        sequence: Repository.Local.Methods.getIndicatorSequence(
                            rc.Indicator
                        )
                    };
                }
                ev[is]['m' + rc.Administration] = rc;
            }
        });
        return Ext.Object.getValues(ev);
    },
    getLimitColorImage: function(className) {
        switch (className) {
            case 'HeatGridValueNotRegister':
                return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAD0lEQVQIHQEEAPv/AMzMzATMAmUGFw0LAAAAAElFTkSuQmCC';
            case 'HeatGridValueLL':
                return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P8uC7yPwAHiQL5CrJDXgAAAABJRU5ErkJggg==';
            case 'HeatGridValueUL':
                return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2M8c6n4PwAHlQMSju5TQgAAAABJRU5ErkJggg==';
            case 'HeatGridValueML':
                return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P89yDtPwAIbQNFosHXUQAAAABJRU5ErkJggg==';
            default:
                return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        }
    },
    getIndicatorHeatCalc: function(aValue, t, nonRegistering, regEx) {
        var tdCls, m;
        if (Ext.isEmpty(aValue) || aValue.Measure === null) {
            if (nonRegistering && nonRegistering.match(regEx)) {
                tdCls = 'HeatGridValueNotRegister';
                m = '<i>(inget värde förväntat)</i>';
            } else {
                tdCls = 'HeatGridValueNull';
                m = '<i>(förväntat värde saknas)</i>';
            }
        } else {
            if (t.LimitBelow < t.LimitAbove) {
                // Not the case for reversed indicators.
                if (aValue.Measure < t.LimitBelow) {
                    tdCls = 'HeatGridValueLL';
                } else {
                    if (aValue.Measure < t.LimitAbove) {
                        tdCls = 'HeatGridValueML';
                    } else {
                        tdCls = 'HeatGridValueUL';
                    }
                }
            } else {
                if (aValue.Measure <= t.LimitAbove) {
                    tdCls = 'HeatGridValueUL';
                } else {
                    if (aValue.Measure <= t.LimitBelow) {
                        tdCls = 'HeatGridValueML';
                    } else {
                        tdCls = 'HeatGridValueLL';
                    }
                }
            }
            m = Ext.String.format(
                '{0}<br/>{1} observationer.<br/>{2}. Mål {3}.',
                Repository.Local.Methods.mapManagementCodeToName(
                    aValue.Administration
                ),
                aValue.Size,
                Ext.util.Format.number(aValue.Measure, '0.0%'),
                Ext.util.Format.number(t.LimitAbove, '0.0%')
            );
        }
        return {
            m: m,
            tdCls: tdCls
        };
    },
    paintIndicatorHeat: function(scope) {
        return function(aValue, aMeta, aRecord, aCellY, aCellX, aStore, aView) {
            var t = Repository.Local.Methods.getIndicatorTargets(
                aRecord.get('indicator')
            ),
                administration = aMeta.column && aMeta.column.dataIndex,
                nonRegistering = aRecord.get('hasNonRegistering'),
                regEx = new RegExp('(^|\\s)' + administration + '(\\s|$)'),
                widget = scope,
                m,
                baseImg;
            var calcs = widget.getIndicatorHeatCalc(
                aValue,
                t,
                nonRegistering,
                regEx
            );

            m = calcs.m;
            aMeta.tdCls = calcs.tdCls;

            aMeta.tdAttr = Ext.String.format('data-qtip="{0}"', m);
            aMeta.style = 'height: 100%; width: 100%; display: inline-block; min-height:58px; padding: 0 !important;';
            return aMeta.tdCls
                ? '<img src="' +
                      widget.getLimitColorImage(aMeta.tdCls) +
                      '" style="display: none; width: 100%; height: 100%">'
                : null;
        };
    },
    paintIndicatorName: function(aValue, aMeta, aRecord) {
        //  aMeta.style = 'white-space: inherit;';
        aMeta.tdCls = 'HeatGridName';
        return '<i>' +
            Repository.Local.Methods.mapTitleCodeToName(aValue) +
            '</i><br>' +
            Repository.Local.Methods.mapIndicatorCodeToName(aValue);
    },
    getIsManagementRegistering: function(gridRecord) {
        var store = Ext.StoreManager.lookup('KVIndicatorStore');
        var indicatorRecord = store.findRecord(
            'valueCode',
            gridRecord.get('indicator')
        );
        var domainValueID, tmp = '';
        if (indicatorRecord) {
            domainValueID = indicatorRecord.get('DomainValueID');
            Repository.Local.Methods.ajaxCall(
                '/api/metadata/domainvalues/' + domainValueID,
                function(res, json) {
                    var children = json.result &&
                        json.result.data &&
                        json.result.data.Children;
                    if (!Ext.isEmpty(children)) {
                        Ext.Array.each(children, function(el) {
                            tmp += 'm' + el.ValueCode + ' ';
                        });
                        gridRecord.set('hasNonRegistering', tmp);
                    }
                }
            );
        }
    },
    getHospitalsInManagement: function(managementCode) {
        var arr = [], manCode = managementCode + '';
        Ext.Object.each(Repository.Local.domainMaps.hospital, function(
            key,
            value
        ) {
            if (key.indexOf(manCode) === 0) {
                arr.push(value);
            }
        });
        return Ext.Array.sort(arr);
    },
    getEffectivenessColumns: function() {
        var widget = this,
            management = Ext.Object.getKeys(
                Repository.Local.Methods.mapManagementCodeToName() || {}
            ),
            indicatorName = {
                text: 'Indikator',
                dataIndex: 'indicator',
                flex: 1,
                minWidth: 250,
                sortable: false,
                renderer: widget.paintIndicatorName
            },
            arr = [];
        Ext.each(management, function(m) {
            arr.push({
                text: Repository.Local.Methods.mapManagementCodeToName(m),
                tooltip: (
                    '<b>' +
                        Repository.Local.Methods.mapManagementCodeToName(m) +
                        '</b><br>' +
                        widget.getHospitalsInManagement(m).join('<br>')
                ), //Repository.Local.Methods.mapManagementCodeToName(m),
                dataIndex: 'm' + m,
                cls: 'multiline-header-grid',
                width: 55, //m === 53014 ? 44 : 40,
                height: 50,
                sortable: false,
                renderer: widget.paintIndicatorHeat(widget)
            });
        });
        Ext.Array.sort(arr, function(a, b) {
            return a.text.localeCompare(b.text);
        });
        return Ext.Array.merge(indicatorName, arr);
    },
    initCss: function() {
        Ext.util.CSS.createStyleSheet(
            '.HeatGrid table { border-collapse: collapse; overflow: hidden; } ' +
                '.HeatGrid .x-grid-row .x-grid-cell { border-color: #ddd; cursor: pointer; } ' +
                '.HeatGrid .x-grid-row-over { background-color: #eee; } ' +
                '.HeatGrid .x-grid-row-over .x-grid-td { background-color: #fff; }' +
                '.HeatGrid .x-grid-cell-inner, .HeatGrid .x-column-header-inner { padding: 6px 5px !important;}' +
                '.HeatGridName .x-grid-cell-inner { white-space: normal; } ' +
                '.HeatGridName.x-grid-cell-selected  { background-color: #fff !important; } ' +
                '.HeatGridValueNull:hover { cursor: default !important; color: #333333 !important; background-color: #eee !important; } ' +
                '.HeatGridValueNull { color: #FFB2B2; background-color: #fff !important; } ' +
                '.HeatGridValueLL { color: #FFB2B2; background-color: #f1ae59 !important; } ' +
                '.HeatGridValueLL:hover { color: #333333 !important; background-color: #e98300 !important; } ' +
                '.HeatGridValueNotRegister { color: #FFB2B2; background-color: #ccc !important; } ' +
                '.HeatGridValueNotRegister:hover { cursor: default !important; color: #333333 !important; background-color: #bbb !important; } ' +
                '.HeatGridValueML { color: #FFFFB2; background-color: #fee066 !important; } ' +
                '.HeatGridValueML:hover { color: #333333; background-color: #fecb00 !important; } ' +
                '.HeatGridValueUL { color: #A9F3A9; background-color: #ccd273 !important; } ' +
                '.HeatGridValueUL:hover { color: #333333; background-color: #a2ad00 !important; } ' +
                '.multiline-header-grid .x-column-header-inner .x-column-header-text { ' +
                'white-space: normal; display: table-cell; vertical-align: middle; font-size: 9px; text-align: center; }' +
                '.multiline-header-grid .x-column-header-inner { line-height: normal; padding: 1px !important; vertical-align: middle; }' +
                '.x-safari .x-tip {width: auto !important;}.x-safari .x-tip-body {width: auto !important;}.x-safari .x-tip-body span {width: auto !important;}' //Safari tip bug
        );
    },
    preInit: function() {
        Ext.fly('EffectivenessGridContainer').mask('Hämtar data ...');
    },
    init: function(_m) {
        var widget = this, store;
        Ext.fly('EffectivenessGridContainer').unmask();
        widget.initCss();
        // if (aMessage) {
        //     //TODO: inform user in a meaningful way that initialization has failed.
        //     return;
        // }
        typeof EffectivenessModel === 'undefined' &&
            Ext.define('EffectivenessModel', {
                extend: 'Ext.data.Model',
                fields: widget.getEffectivenessFields()
            });

        Ext.create('Ext.panel.Panel', {
            renderTo: 'EffectivenessGridContainer',
            width: '100%',
            border: false,
            bodyPadding: 0,
            margin: '0 0 16px 0',
            layout: {
                type: 'hbox'
            },
            defaults: {
                cls: 'WidgetFormItem',
                listConfig: {
                    cls: 'WidgetListItem'
                },
                editable: false,
                labelAlign: 'left'
            },
            items: [
                {
                    xtype: 'combobox',
                    flex: 1,
                    padding: '0 5px 0 0',
                    emptyText: 'Välj period ...',
                    checkChangeEvents: (
                        Ext.isIE10p
                            ? ['change', 'propertychange', 'keyup']
                            : [
                                  'change',
                                  'input',
                                  'textInput',
                                  'keyup',
                                  'dragdrop'
                              ]
                    ),
                    store: Ext.create('Ext.data.Store', {
                        fields: ['valueCode', 'valueName'],
                        data: _m.getPeriodCodeNamePairs()
                    }),
                    queryMode: 'local',
                    displayField: 'valueName',
                    valueField: 'valueCode',
                    value: Repository.Local.current.period,
                    listeners: {
                        select: function(aCombo, aSelection) {
                            Repository.Local.current.period = aSelection.get(
                                'valueCode'
                            );
                            Ext.data.StoreManager
                                .lookup('EffectivenessStore')
                                .loadData(widget.getEffectivenessValues());
                        }
                    }
                },
                {
                    xtype: 'combobox',
                    width: 100,
                    padding: '0 5px 0 0',
                    emptyText: 'Välj årtal ...',
                    fieldLabel: 'för',
                    labelWidth: 20,
                    store: Ext.create('Ext.data.Store', {
                        fields: ['valueCode', 'valueName'],
                        data: _m.getPossibleYears()
                    }),
                    queryMode: 'local',
                    displayField: 'valueName',
                    valueField: 'valueCode',
                    checkChangeEvents: (
                        Ext.isIE10p
                            ? ['change', 'propertychange', 'keyup']
                            : [
                                  'change',
                                  'input',
                                  'textInput',
                                  'keyup',
                                  'dragdrop'
                              ]
                    ),
                    value: Repository.Local.current.yearOfPeriod,
                    listeners: {
                        select: function(aCombo, aSelection) {
                            Repository.Local.current.yearOfPeriod = aSelection.get(
                                'valueCode'
                            );
                            Ext.data.StoreManager
                                .lookup('EffectivenessStore')
                                .loadData(widget.getEffectivenessValues());
                        }
                    }
                },
                {
                    xtype: 'combobox',
                    width: 150,
                    emptyText: 'Välj kön ...',
                    store: Ext.create('Ext.data.Store', {
                        //TODO: use domainForStore in local script to generate store.
                        fields: ['valueCode', 'valueName'],
                        data: _m.domainForStore(_m.mapGenderCodeToName)
                    }),
                    queryMode: 'local',
                    displayField: 'valueName',
                    valueField: 'valueCode',
                    value: Repository.Local.current.gender,
                    checkChangeEvents: (
                        Ext.isIE10p
                            ? ['change', 'propertychange', 'keyup']
                            : [
                                  'change',
                                  'input',
                                  'textInput',
                                  'keyup',
                                  'dragdrop'
                              ]
                    ),
                    listeners: {
                        select: function(aCombo, aSelection) {
                            Repository.Local.current.gender = aSelection.get(
                                'valueCode'
                            );
                            Ext.data.StoreManager
                                .lookup('EffectivenessStore')
                                .loadData(widget.getEffectivenessValues());
                        }
                    }
                },
                Ext.create('Ext.Button', {
                    text: 'Hämta Bild',
                    // hidden: Ext.isIE10p,
                    handler: function() {
                        var timePeriod = 'Tidsperiod: ' +
                            _m.mapPeriodCodeToName(
                                Repository.Local.current.period
                            ) +
                            ' (' +
                            Repository.Local.current.yearOfPeriod +
                            ')';

                        var gender = 'Kön: ' +
                            _m.mapGenderCodeToName(
                                Repository.Local.current.gender
                            );

                        var dataUrls = _m.heatMapToPictures(store.data, {
                            padding: 20,
                            margins: {
                                top: 80,
                                bottom: 40
                            },
                            header: [timePeriod, gender],
                            colors: {
                                HeatGridValueML: '#fee066',
                                HeatGridValueLL: '#f1ae59',
                                HeatGridValueUL: '#ccd273',
                                na: '#ccc'
                            },
                            calcFunc: widget.getIndicatorHeatCalc
                        });
                        dataUrls.forEach(function(dataUrl, i) {
                            var a = document.createElement('a'),
                                today = new Date().toLocaleDateString();
                            a.setAttribute('href', dataUrl);
                            var pageNo = i +1;
                            a.setAttribute(
                                'download',
                                'måluppfyllelse-' + today + '-del-' + pageNo + '.png'
                            );
                            a.style.display = 'none';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                        });

                        // var imgTag = document.createElement('img');
                        // imgTag.src = dataUrl;
                        // document.body.appendChild(imgTag);
                    }
                })
            ]
        });
        store = Ext.create('Ext.data.Store', {
            storeId: 'EffectivenessStore',
            model: 'EffectivenessModel',
            data: widget.getEffectivenessValues(),
            listeners: {
                datachanged: function(
                    store,
                    records,
                    successful,
                    operation,
                    eOpts
                ) {
                    store.each(widget.getIsManagementRegistering);
                }
            },
            sorters: [
                {
                    property: 'sequence',
                    direction: 'ASC'
                }
            ]
        });
        Ext.create('Ext.grid.Panel', {
            store: Ext.data.StoreManager.lookup('EffectivenessStore'),
            columns: widget.getEffectivenessColumns(),
            cls: 'HeatGrid',
            emptyText: 'Ingen data finns för valda parametrar.',
            width: '100%',
            columnLines: true,
            rowLines: true,
            border: true,
            enableColumnHide: false,
            enableColumnMove: false,
            enableColumnResize: false,
            disableSelection: true,
            renderTo: 'EffectivenessGridContainer',
            listeners: {
                cellclick: function(aGrid, aTD, aCellX, aRecord) {
                    Repository.Local.current.indicator = aRecord.get(
                        'indicator'
                    );
                    if (aCellX === 0) {
                        _m.navigateToPage(1275);
                    } else {
                        var m = aRecord.get(
                            aGrid.getGridColumns()[aCellX].dataIndex
                        );
                        if (m && m.Measure !== null) {
                            // Only show results if there are any.
                            Repository.Local.current.management = m.Administration;
                            _m.navigateToPage(1276);
                        }
                    }
                },
                afterrender: function(grid) {
                    widget.initHeaderAffix(grid); //Make the column header follow scroll
                }
            }
        });

        store.each(widget.getIsManagementRegistering);
    }
});

//! Tabell över inrapporterade kvalitetsindikatorer per förvaltning för angiven tidsperiod och kön. Infärgning visar måluppfyllelse.
//# sourceURL=SID/EffectivenessGrid
