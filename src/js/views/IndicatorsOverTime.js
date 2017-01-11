Repository.Local.Methods.initialize({
    initSampleSizes: function () {
        var db = Repository.Local.database,
            pc = Repository.Local.current.period,
            yc = Repository.Local.current.yearOfPeriod,
            ac = Repository.Local.current.administration,
            gc = parseInt(Repository.Local.current.gender, 10),
            ic = Repository.Local.current.indicator,
            curr = Repository.Local.current.sizes = {
                gcs: {},
                pcs: {},
                ycs: {}
            };

        //TODO refactor this for current implementation
        Ext.Array.forEach(db.Indicators, function (rc) {
            if (rc.Indicator === ic && rc.Administration.length === 5) {
                if (yc === rc.YearOfPeriod && pc === rc.Period) {
                    curr.gcs[rc.Gender] = curr.gcs[rc.Gender] || {
                        size: 0
                    };
                    curr.gcs[rc.Gender].size += rc.Size;
                }
                if (rc.Gender === gc) {
                    if (yc === rc.YearOfPeriod) {
                        curr.pcs[rc.Period] = curr.pcs[rc.Period] || {
                            size: 0
                        };
                        curr.pcs[rc.Period].size += rc.Size;
                    }
                    if (pc === rc.Period) {
                        curr.ycs[rc.YearOfPeriod] = curr.ycs[rc.YearOfPeriod] || {
                            size: 0
                        };
                        curr.ycs[rc.YearOfPeriod].size += rc.Size;
                    }
                }
            }
        });
    },
    getSampleSizes: function (sorttype) {
        var sortenum = Repository.Local.SORTTYPE,
            ret = {};
        if (!Repository.Local.current.sizes) {
            return ret;
        }
        switch (sorttype) {
            case sortenum.Hospital:
                ret = Repository.Local.current.sizes.vcs || {};
                break;
            case sortenum.Period:
                ret = Repository.Local.current.sizes.pcs || {};
                break;
            case sortenum.Year:
                ret = Repository.Local.current.sizes.ycs || {};
                break;
            case sortenum.Gender:
                ret = Repository.Local.current.sizes.gcs || {};
                break;
            default:
                break;
        }
        return ret;
    },
    getManagementValues: function () {

        var db = Repository.Local.database,
            pc = Repository.Local.current.period,
            gc = parseInt(Repository.Local.current.gender, 10),
            ic = Repository.Local.current.indicator,
            ac = Repository.Local.current.administration,
            yc = Repository.Local.current.yearOfPeriod;

        var minimumYear = yc - 3;
        var returnHash = {};

        function createDataPoint(rc) {
            var isVgr = (rc.Administration == 55555);

            var quarter = rc.YearOfPeriod + '-' + rc.Period;

            returnHash[quarter] = returnHash[quarter] || {
                quarter: quarter
            };

            if (isVgr) {
                Ext.Object.merge(returnHash[quarter], {
                    vgr: rc.Measure,
                    vgrDeviation: rc.Deviation,
                    vgrSize: rc.Size
                });
            } else {
                return Ext.Object.merge(returnHash[quarter], {
                    admTitle: Repository.Local.Methods.mapAdministrationCodeToName(rc.Administration),
                    administration: rc.Measure,
                    admDeviation: rc.Deviation,
                    admSize: rc.Size
                });
            }
        }

        function createDataPointtmp(rc) {
            var quarter = rc.YearOfPeriod + '-' + rc.Period,
                title = Repository.Local.Methods.mapAdministrationCodeToName(rc.Administration);

            return {
                quarter: quarter,
                administration: title,
                measure: rc.Measure,
                deviation: rc.Deviation,
                size: rc.Size
            };
        }

        function filterFunc(rc) {
            return rc.Indicator === ic && (rc.Administration == ac || rc.Administration == 55555) && rc.YearOfPeriod >= minimumYear && rc.Gender === gc && rc.Period < 5;
        }

        function sortByQuarter(a, b) {
            //todo , make correct, quarter to onth is wrong..
            var aQuarter = a.quarter.split('-'),
                bQuarter = b.quarter.split('-');
            var aDate = new Date(aQuarter[0], 12 / 4 * aQuarter[1] - 3, 1),
                bDate = new Date(bQuarter[0], 12 / 4 * bQuarter[1] - 3, 1);
            return aDate - bDate;
        }

        Ext.Array
            .each(Ext.Array.filter(db.Indicators, filterFunc), createDataPoint);

        var vc = Ext.Object.getValues(returnHash).sort(sortByQuarter);
        this.initSampleSizes();
        console.table(vc);
        return vc;
    },
    sizeRefresh: function (scope, sortType) {
        var sizes = this.getSampleSizes(sortType);
        scope.each(function (aRecord) {
            aRecord.data.size = sizes[aRecord.data.valueCode] ? sizes[aRecord.data.valueCode].size : 0; // Add total sample size to each store record.
        });
    },
    dropdownRefresh: function (scope, _m) {
        var combos,
            store = Ext.data.StoreManager.lookup('IndicatorOverTimeStore');

        store && store.loadData(this.getManagementValues());
        
        this._chart.getSeries()[0] && this._chart.series[0].setTitle(Repository.Local.Methods.mapAdministrationCodeToName(Repository.Local.current.administration));
        combos = scope.ownerCt.query('combo');
        Ext.Array.each(combos, function (cc) {
            !cc.isIndicatorCombo && cc.getStore().reload(); // Ensure that combo with itemTpl is reexecuted when combo list is opened.
        });
    },
    preInit: function () {
        Ext.fly('ManagementIndicatorContainer').mask('Hämtar data ...');
    },
    init: function (_m) {
        var widget = this;
        Repository.Local.SORTTYPE = {
            Hospital: 0,
            Period: 1,
            Year: 2,
            Gender: 3
        };

        typeof IndicatorOverTimeModel === 'undefined' && Ext.define('IndicatorOverTimeModel', {
            extend: 'Ext.data.Model',
            fields: [{
                name: 'quarter',
                type: 'string',
                useNull: true
            }, {
                name: 'admTitle',
                type: 'string',
                useNull: true
            }, {
                name: 'admDeviation',
                type: 'float',
                useNull: true
            }, {
                name: 'administration',
                type: 'float',
                useNull: true
            }, {
                name: 'admSize',
                type: 'float',
                useNull: true
            },
            {
                name: 'vgrDeviation',
                type: 'float',
                useNull: true
            }, {
                name: 'vgr',
                type: 'float',
                useNull: true
            }, {
                name: 'vgrSize',
                type: 'float',
                useNull: true
            }]
        });

        var sampleSizeConfiguration = {
            cls: 'WidgetListItem',
            itemTpl: Ext.create('Ext.XTemplate',
                '<span class="WidgetListItemInner" style="{[this.getStyle(values)]}">{valueName}</span>', {
                    getStyle: function (aRecord) {
                        return typeof aRecord.size === 'undefined' || aRecord.size > 0 ? '' : 'color: #999';
                    }
                }
            )
        };
        Ext.fly('ManagementIndicatorContainer').unmask();

        Ext.create('Ext.panel.Panel', {
            renderTo: 'ManagementIndicatorContainer',
            width: '100%',
            margin: '10px 0 20px 0',
            border: false,
            layout: {
                type: 'vbox'
            },
            defaults: {
                cls: 'WidgetFormItem',
                editable: false
            },
            items: [{
                xtype: 'combobox',
                checkChangeEvents: Ext.isIE10p ? ['change', 'propertychange', 'keyup'] : ['change', 'input', 'textInput', 'keyup', 'dragdrop'],
                width: '100%',
                flex: 1,
                isIndicatorCombo: true,
                margin: '0 1px 0 0',
                emptyText: 'Välj indikator ...',
                store: 'KVIndicatorStore',
                queryMode: 'local',
                displayField: 'valueName',
                valueField: 'valueCode',
                listConfig: {
                    titleCodeToName: function (value) {
                        return _m.mapTitleCodeToName(value);
                    },
                    getInnerTpl: function () {
                        return '<i>{title}</i><br/>{valueName}';
                    }
                },
                value: Repository.Local.current.indicator,
                listeners: {
                    select: function (aCombo, aSelection) {
                        Repository.Local.current.indicator = aSelection.get('valueCode');
                        widget.dropdownRefresh(aCombo, _m);
                    }
                }
            }, {
                xtype: 'container',
                margin: '8px 0 0 0',
                defaults: {
                    cls: 'WidgetFormItem',
                    editable: false
                },
                layout: {
                    type: 'hbox'
                },
                width: '100%',
                items: [{
                    xtype: 'combobox',
                    checkChangeEvents: Ext.isIE10p ? ['change', 'propertychange', 'keyup'] : ['change', 'input', 'textInput', 'keyup', 'dragdrop'],
                    flex: 1,
                    padding: '0 5px 0 0',
                    emptyText: 'Välj Förvaltning/sjukhus...',
                    store: Ext.create('Ext.data.Store', {
                        fields: ['valueCode', 'valueName', 'type'],
                        data: _m.getAdministrationCodeNamePairs(),
                        listeners: {
                            datachanged: function () {
                                widget.sizeRefresh(this, Repository.Local.SORTTYPE.Hospital);
                            }
                        }

                    }),
                    queryMode: 'local',
                    displayField: 'valueName',
                    valueField: 'valueCode',
                    listConfig: {
                        cls: 'grouped-list'
                    },
                    value: Repository.Local.current.administration,
                    listeners: {
                        select: function (aCombo, aSelection) {
                            Repository.Local.current.administration = aSelection.get('valueCode');
                            widget.dropdownRefresh(aCombo, _m);
                        }
                    },
                    tpl: Ext.create('Ext.XTemplate',
                        '{[this.currentKey = null]}' +
                        '<tpl for=".">',
                        '<tpl if="this.shouldShowHeader(type)">' +
                        '<div class="group-header">{[this.showHeader(values.type)]}</div>' +
                        '</tpl>' +
                        '<div class="x-boundlist-item">{valueName}</div>',
                        '</tpl>', {
                            shouldShowHeader: function (key) {
                                return this.currentKey != key;
                            },
                            showHeader: function (key) {
                                this.currentKey = key;
                                switch (key) {
                                    case 'hospital':
                                        return 'Sjukhus';
                                    case 'management':
                                        return 'Förvaltning';
                                    default:
                                        return 'Okänd';
                                }
                            }
                        })
                }, {
                    xtype: 'combobox',
                    checkChangeEvents: Ext.isIE10p ? ['change', 'propertychange', 'keyup'] : ['change', 'input', 'textInput', 'keyup', 'dragdrop'],
                    width: 110,
                    padding: '0 5px 0 0',
                    labelWidth: 20,
                    fieldLabel: 'för',
                    emptyText: 'Välj årtal ...',
                    store: Ext.create('Ext.data.Store', {
                        fields: ['valueCode', 'valueName'],
                        data: _m.getPossibleYears(),
                        listeners: {
                            datachanged: function () {
                                widget.sizeRefresh(this, Repository.Local.SORTTYPE.Year);
                            }
                        }
                    }),
                    queryMode: 'local',
                    displayField: 'valueName',
                    valueField: 'valueCode',
                    listConfig: sampleSizeConfiguration,
                    value: Repository.Local.current.yearOfPeriod,
                    listeners: {
                        select: function (aCombo, aSelection) {
                            Repository.Local.current.yearOfPeriod = aSelection.get('valueCode');
                            widget.dropdownRefresh(aCombo, _m);
                        }
                    }
                }, {
                    xtype: 'combobox',
                    checkChangeEvents: Ext.isIE10p ? ['change', 'propertychange', 'keyup'] : ['change', 'input', 'textInput', 'keyup', 'dragdrop'],
                    width: 170,
                    emptyText: 'Välj kön ...',
                    store: Ext.create('Ext.data.Store', { //TODO: use domainForStore in local script to generate store.
                        fields: ['valueCode', 'valueName'],
                        data: _m.domainForStore(_m.mapGenderCodeToName),
                        listeners: {
                            datachanged: function () {
                                widget.sizeRefresh(this, Repository.Local.SORTTYPE.Gender);
                            }
                        }
                    }),
                    queryMode: 'local',
                    displayField: 'valueName',
                    valueField: 'valueCode',
                    listConfig: sampleSizeConfiguration,
                    value: Repository.Local.current.gender,
                    listeners: {
                        select: function (aCombo, aSelection) {
                            Repository.Local.current.gender = aSelection.get('valueCode');
                            widget.dropdownRefresh(aCombo, _m);
                        }
                    }
                }]
            }]
        });

        Ext.create('Ext.data.Store', {
            storeId: 'IndicatorOverTimeStore',
            model: 'IndicatorOverTimeModel',
            data: widget.getManagementValues()
        });       

        widget._chart = Ext.widget('chart', {
            renderTo: 'ManagementIndicatorContainer',
            width: '100%',
            height: 400,
            border: true,
            layout: 'fit',
            plugins: {
                ptype: 'chartitemevents'
            },
            animation: true,
            animate: true,
            insetPadding: {
                top: 25,
                right: 20,
                bottom: 20,
                left: 20
            },
            store: Ext.data.StoreManager.lookup('IndicatorOverTimeStore'),
            axes: [{
                type: 'numeric',
                position: 'left',
                minimum: 0,
                maximum: 100,
                grid: true,
                fields: 'measure',
                renderer: function (v) {
                    return v + '%';
                }
            }, {
                type: 'category',
                position: 'bottom',
                label: {
                    fontSize: 11
                },
                fields: 'quarter',
                title: 'Kvartaler'
            }],
            series: [{
                type: 'bar',
                axis: 'left',
                stacked: false,
                highlight: {
                    strokeStyle: '#288CA2',
                    fillStyle: ['065598', '#e0921d'],
                    stroke: 'none',
                    opacity: 0.5,
                    cursor: 'pointer'
                },
                subStyle: {
                    strokeStyle: '#288Ca2',
                    fillStyle: ['065598', '#e0921d'],
                    border: false
                },
                tips: {
                    trackMouse: true,
                    dismissDelay: 0,
                    renderer: function(s) {
                        if (!s) {
                            return;
                        }
                        this.update(Ext.String.format(s.get('admSize') ? '{0}<br/>{1} observationer.<br/>{2}. Konfidensintervall &plusmn;{3}.' : '{0}<br/>{1} observationer.',
                            s.get('admTitle'),
                            s.get('size'),
                            Ext.util.Format.number(s.get('administration'), '0.0%'),
                            Ext.util.Format.number(s.get('adnDeviation'), '0.0%')));
                    }
                },
                renderer: _m.kvartalenChartRenderer(['vgrDeviation','admDeviation']),
                xField: 'quarter',
                yField: ['administration','vgr']
            }]
        });
    }

});