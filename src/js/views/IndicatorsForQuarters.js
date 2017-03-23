Repository.Local.Methods.initialize({
    isWithinYear: function(currentYear, year, period) {
        var yearDiff = currentYear - year,
            quarters = ['2341', '3412', '4123', '1234'];
        if (period > 4 || period < 1 || yearDiff > 1 || yearDiff < 0) {
            return [];
        }
        return yearDiff === 0
            ? quarters.slice(period - 1).concat(period.toString())
            : quarters.slice(0, -5 + period);
    },
    isWithinRange: function(aRegistration, aPeriod, aYear) {
        if (aRegistration.Period > 4) {
            return false;
        }
        if (aPeriod <= 4) {
            return aRegistration.Period === aPeriod &&
                aRegistration.YearOfPeriod === aYear;
        }
        // If the position of a quarter in aRegistration, within the string version of aPeriod, is greater than or equal to
        // the expected position (eg. 1 in "4123"), then it is within range if its year equals aYear. Otherwise it
        // is within range if the above is not true and year is previous year.Possible values of
        // period (with separator) is: 1|2|3|4, 2|3|4\1, 3|4\1|2, 4\1|2|3. The slash character
        // represents separation between this and last year. Faster solution anyone?
        var y = aRegistration.YearOfPeriod;
        var f = aPeriod.toString().indexOf(aRegistration.Period.toString()) +
            1 >=
            aRegistration.Period;
        return f && y === aYear || !f && y === aYear - 1;
    },
    //TODO: the method below could be made more generic by accepting a discriminating parameter (ie. Hospital, Gender, Period, YearOfPeriod).
    initSampleSizes: function() {
        var widget = this,
            db = Repository.Local.database,
            pc = Repository.Local.current.period,
            yc = Repository.Local.current.yearOfPeriod,
            gc = parseInt(Repository.Local.current.gender, 10),
            ic = Repository.Local.current.indicator,
            ma = Repository.Local.current.hospital,
            curr = Repository.Local.current.sizes = {
                vcs: {},
                gcs: {},
                pcs: {},
                ycs: {}
            },
            iwr;
        Ext.Array.forEach(db.Indicators, function(rc) {
            if (rc.Indicator === ic) {
                iwr = widget.isWithinRange(rc, pc, yc);
                if (iwr && rc.Gender === gc) {
                    curr.vcs[rc.Administration] = curr.vcs[rc.Administration] ||
                        {
                            size: 0
                        };
                    curr.vcs[rc.Administration].size += rc.Size;
                }
                if (iwr && rc.Administration === ma) {
                    curr.gcs[rc.Gender] = curr.gcs[rc.Gender] ||
                        {
                            size: 0
                        };
                    curr.gcs[rc.Gender].size += rc.Size;
                }
                if (rc.Gender === gc && rc.Administration === ma) {
                    Ext.Array.each(
                        widget.isWithinYear(yc, rc.YearOfPeriod, rc.Period),
                        function(item) {
                            curr.pcs[item] = curr.pcs[item] ||
                                {
                                    size: 0
                                };
                            curr.pcs[item].size += rc.Size;
                        }
                    );
                    curr.ycs[rc.YearOfPeriod] = curr.ycs[rc.YearOfPeriod] ||
                        true;
                }
            }
        });
    },
    dropdownRefresh: function(scope, _m) {
        var combos,
            store = Ext.data.StoreManager.lookup('QuarterlyIndicatorStore');
        store && store.loadData(this.getQuarterlyValues());
        combos = scope.ownerCt.query('combo');
        Ext.Array.each(combos, function(cc) {
            !cc.isIndicatorCombo && cc.getStore().reload(); // Ensure that combo with itemTpl is reexecuted when combo list is opened.
        });
        _m.drawLimitRectangles(this._chart);
    },
    sizeRefresh: function(scope, sortType) {
        var sizes = this.getSampleSizes(sortType);
        scope.each(function(aRecord) {
            aRecord.data.size = sizes[aRecord.data.valueCode]
                ? sizes[aRecord.data.valueCode].size
                : 0; // Add total sample size to each store record.
        });
    },
    getSampleSizes: function(sorttype) {
        var sortenum = Repository.Local.SORTTYPE, ret = {};
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
            case sortenum.Gender:
                ret = Repository.Local.current.sizes.gcs || {};
                break;
            default:
                break;
        }
        return ret;
    },
    getQuarterlyValues: function() {
        var widget = this,
            db = Repository.Local.database,
            pc = Repository.Local.current.period,
            yc = Repository.Local.current.yearOfPeriod,
            gc = parseInt(Repository.Local.current.gender, 10),
            ic = Repository.Local.current.indicator,
            hc = Repository.Local.current.hospital,
            tv = Repository.Local.Methods.getIndicatorTargets(ic),
            vc = [];

        Ext.Array.forEach(db.Indicators, function(rc) {
            // hc could be a number sometimes string of number,
            // rc.Administration is string, double equals coerces the values to same type.
            if (
                rc.Indicator === ic &&
                rc.Gender === gc &&
                rc.Administration == hc &&
                widget.isWithinRange(rc, pc, yc)
            ) {
                //TODO: should instantiate QuarterlyIndicatorModel instead ...
                vc.push({
                    name: (
                        'Kvartal ' +
                            rc.Period.toString() +
                            '\n' +
                            rc.YearOfPeriod.toString()
                    ),
                    hospital: rc.Administration,
                    period: rc.Period,
                    measure: rc.Measure,
                    deviation: rc.Deviation,
                    size: rc.Size,
                    limitAbove: tv.LimitAbove,
                    limitBelow: tv.LimitBelow,
                    year: rc.YearOfPeriod
                });
            }
        });
        //Reload sizes
        //  var time = window.performance.now();
        this.initSampleSizes();
        //  console.log('Time taken: ' + (window.performance.now()-time));
        return vc.sort(function(a, b) {
            return a.year === b.year
                ? a.period === b.period ? 0 : a.period < b.period ? -1 : 1
                : a.year < b.year ? -1 : 1;
        });
    },
    preInit: function() {
        Ext.fly('QuarterlyIndicatorContainer').mask('Hämtar data ...');
    },
    init: function(_m) {
        var widget = this;
        Ext.fly('QuarterlyIndicatorContainer').unmask();

        Repository.Local.SORTTYPE = {
            Hospital: 0,
            Period: 1,
            Year: 2,
            Gender: 3
        };
        //TODO: replace this with one generic model (in common methods).
        typeof QuarterlyIndicatorModel === 'undefined' &&
            Ext.define('QuarterlyIndicatorModel', {
                extend: 'Ext.data.Model',
                fields: [
                    {
                        name: 'name',
                        type: 'string',
                        useNull: true
                    },
                    {
                        name: 'hospital',
                        type: 'string',
                        useNull: true
                    },
                    {
                        name: 'period',
                        type: 'int',
                        useNull: true
                    },
                    {
                        name: 'measure',
                        type: 'float',
                        useNull: true
                    },
                    {
                        name: 'deviation',
                        type: 'float',
                        useNull: true
                    },
                    {
                        name: 'size',
                        type: 'float',
                        useNull: true
                    },
                    {
                        name: 'limitBelow',
                        type: 'float',
                        useNull: true
                    },
                    {
                        name: 'limitAbove',
                        type: 'float',
                        useNull: true
                    }
                ]
            });

        // if (aMessage) {
        //TODO: inform user somehow that initialization has failed.
        // return;
        // }

        var sampleSizeConfiguration = {
            cls: 'WidgetListItem',
            itemTpl: Ext.create(
                'Ext.XTemplate',
                '<span class="WidgetListItemInner" style="{[this.getStyle(values)]}">{valueName}</span>',
                {
                    getStyle: function(aRecord) {
                        return aRecord.size === undefined || aRecord.size > 0
                            ? ''
                            : 'color: #999';
                    }
                }
            )
        };

        Ext.create('Ext.data.Store', {
            storeId: 'QuarterlyIndicatorStore',
            model: 'QuarterlyIndicatorModel',
            data: widget.getQuarterlyValues()
        });

        widget._chart = Ext.widget('exportChart', {
            width: '100%',
            height: 400,
            layout: 'fit',
            border: true,
            animation: true,
            padding: '8px 0',
            animate: true,
            store: Ext.data.StoreManager.lookup('QuarterlyIndicatorStore'),
            insetPadding: {
                top: 25,
                right: 20,
                bottom: 20,
                left: 20
            },
            listeners: {
                redraw: function(chart) {
                    try {
                        if (
                            !chart._lastInnerRect ||
                            chart.innerRect[3] !== chart._lastInnerRect[3]
                        ) {
                            _m.drawLimitRectangles(chart);
                        }
                        chart._lastInnerRect = chart.innerRect;
                    } catch (e) {
                        // console.error(e);
                    }
                }
            },
            axes: [
                {
                    type: 'numeric',
                    position: 'left',
                    minimum: 0,
                    maximum: 100,
                    grid: true,
                    renderer: function(v) {
                        return v + '%';
                    }
                },
                {
                    type: 'category',
                    position: 'bottom'
                }
            ],
            series: [
                {
                    type: 'bar',
                    axis: 'left',
                    highlight: {
                        strokeStyle: '#288CA2',
                        fillStyle: '#3CB6CE',
                        stroke: 'none',
                        opacity: 0.5,
                        cursor: 'pointer'
                    },
                    subStyle: {
                        strokeStyle: '#288CA2',
                        fillStyle: '#3CB6CE',
                        border: false
                    },
                    tips: {
                        trackMouse: true,
                        dismissDelay: 0,
                        renderer: function(s) {
                            if (!s) {
                                return;
                            }
                            this.update(
                                Ext.String.format(
                                    s.get('size')
                                        ? '{0}<br/>{1} observationer.<br/>{2}. Konfidensintervall &plusmn;{3}.'
                                        : '{0}<br/>{1} observationer.',
                                    _m.mapHospitalCodeToName(s.get('hospital')),
                                    s.get('size'),
                                    Ext.util.Format.number(
                                        s.get('measure'),
                                        '0.0%'
                                    ),
                                    Ext.util.Format.number(
                                        s.get('deviation'),
                                        '0.0%'
                                    )
                                )
                            );
                        }
                    },
                    renderer: _m.kvartalenChartRenderer({
                        measure: 'deviation'
                    }),
                    xField: 'name',
                    yField: 'measure'
                }
            ]
        });

        var downloadPicBtn = Ext.create('Ext.Button', {
            text: 'Hämta Bild',
            handler: function() {
                var chart = widget._chart;
                var today = new Date().toLocaleDateString();
                var filename = 'Indikatorvärden_per_sjukhus-kvartal-' +
                    today +
                    '.png';
                var indicatorText = 'Indikator: ' +
                    _m.mapTitleCodeToName(Repository.Local.current.indicator);
                var indicatorSubText = '                ' +
                    _m.mapIndicatorCodeToName(
                        Repository.Local.current.indicator
                    );
                var timePeriod = 'Tidsperiod: ' +
                    _m.mapPeriodCodeToName(Repository.Local.current.period) +
                    ' (' +
                    Repository.Local.current.yearOfPeriod +
                    ')';
                var gender = 'Kön: ' +
                    _m.mapGenderCodeToName(Repository.Local.current.gender);
                var hospital = 'Sjukhus: ' +
                    _m.mapHospitalCodeToName(Repository.Local.current.hospital);
                var dataUrl = chart.generatePicture({
                    padding: 10,
                    header: {
                        height: 22 * 5,
                        items: [
                            indicatorText,
                            indicatorSubText,
                            timePeriod,
                            gender,
                            hospital
                        ]
                    },
                    table: {
                        height: 30,
                        font: {
                            size: '9px'
                        },
                        keys: [
                            {
                                title: 'Observationer',
                                key: 'size'
                            }
                        ]
                    }
                });
                if (window.navigator.msSaveBlob) {
                    window.navigator.msSaveBlob(dataUrl, filename);
                } else {
                    var a = document.createElement('a');
                    a.setAttribute('href', dataUrl);
                    a.setAttribute('download', filename);
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            }
        });

        Ext.create('Ext.panel.Panel', {
            renderTo: 'QuarterlyIndicatorContainer',
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
            items: [
                {
                    xtype: 'combobox',
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
                    margin: '0 1px 0 0',
                    width: '100%',
                    flex: 1,
                    emptyText: 'Välj indikator ...',
                    isIndicatorCombo: true,
                    store: 'KVIndicatorStore',
                    queryMode: 'local',
                    displayField: 'valueName',
                    valueField: 'valueCode',
                    value: Repository.Local.current.indicator,
                    listConfig: {
                        getInnerTpl: function() {
                            return '<i>{title}</i><br/>{valueName}';
                        }
                    },
                    listeners: {
                        select: function(aCombo, aSelection) {
                            Repository.Local.current.indicator = aSelection.get(
                                'valueCode'
                            );
                            widget.dropdownRefresh(aCombo, _m);
                        }
                    }
                },
                {
                    xtype: 'container',
                    margin: '8px 0 0 0',
                    bodyPadding: 0,
                    defaults: {
                        cls: 'WidgetFormItem',
                        editable: false
                    },
                    layout: {
                        type: 'hbox'
                    },
                    width: '100%',
                    items: [
                        {
                            xtype: 'combobox',
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
                            flex: 1,
                            padding: '0 5px 0 0',
                            emptyText: 'Välj period ...',
                            store: Ext.create('Ext.data.Store', {
                                fields: ['valueCode', 'valueName'],
                                data: _m.getPeriodCodeNamePairs(),
                                listeners: {
                                    datachanged: function() {
                                        widget.sizeRefresh(
                                            this,
                                            Repository.Local.SORTTYPE.Period
                                        );
                                    }
                                }
                            }),
                            queryMode: 'local',
                            displayField: 'valueName',
                            valueField: 'valueCode',
                            listConfig: sampleSizeConfiguration,
                            value: Repository.Local.current.period,
                            listeners: {
                                select: function(aCombo, aSelection) {
                                    Repository.Local.current.period = aSelection.get(
                                        'valueCode'
                                    );
                                    widget.dropdownRefresh(aCombo, _m);
                                }
                            }
                        },
                        {
                            xtype: 'combobox',
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
                            width: 110,
                            padding: '0 5px 0 0',
                            labelWidth: 20,
                            fieldLabel: 'för',
                            emptyText: 'Välj årtal ...',
                            store: Ext.create('Ext.data.Store', {
                                fields: ['valueCode', 'valueName'],
                                data: _m.getPossibleYears(),
                                listeners: {
                                    datachanged: function() {
                                        widget.sizeRefresh(
                                            this,
                                            Repository.Local.SORTTYPE.Year
                                        );
                                    }
                                }
                            }),
                            queryMode: 'local',
                            displayField: 'valueName',
                            valueField: 'valueCode',
                            value: Repository.Local.current.yearOfPeriod,
                            listeners: {
                                select: function(aCombo, aSelection) {
                                    Repository.Local.current.yearOfPeriod = aSelection.get(
                                        'valueCode'
                                    );
                                    widget.dropdownRefresh(aCombo, _m);
                                }
                            }
                        },
                        {
                            xtype: 'combobox',
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
                            width: 170,
                            emptyText: 'Välj kön ...',
                            store: Ext.create('Ext.data.Store', {
                                //TODO: use domainForStore in local script to generate store.
                                fields: ['valueCode', 'valueName'],
                                data: _m.domainForStore(_m.mapGenderCodeToName),
                                listeners: {
                                    datachanged: function() {
                                        widget.sizeRefresh(
                                            this,
                                            Repository.Local.SORTTYPE.Gender
                                        );
                                    }
                                }
                            }),
                            queryMode: 'local',
                            displayField: 'valueName',
                            valueField: 'valueCode',
                            listConfig: sampleSizeConfiguration,
                            value: Repository.Local.current.gender,
                            listeners: {
                                select: function(aCombo, aSelection) {
                                    Repository.Local.current.gender = aSelection.get(
                                        'valueCode'
                                    );
                                    widget.dropdownRefresh(aCombo, _m);
                                }
                            }
                        }
                    ]
                },
                {
                    xtype: 'combobox',
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
                    width: '100%',
                    margin: '8px 1px 0 0',
                    fieldLabel: 'Sjukhus',
                    labelWidth: 60,
                    emptyText: 'Välj sjukhus ...',
                    queryMode: 'local',
                    displayField: 'valueName',
                    valueField: 'valueCode',
                    value: Repository.Local.current.hospital,
                    listConfig: sampleSizeConfiguration,
                    store: Ext.create('Ext.data.Store', {
                        fields: ['valueCode', 'valueName'],
                        data: _m.domainForStore(_m.mapHospitalCodeToName),
                        listeners: {
                            datachanged: function() {
                                //TODO: refactor into separate method to reuse.
                                widget.sizeRefresh(
                                    this,
                                    Repository.Local.SORTTYPE.Hospital
                                );
                            }
                        },
                        sorters: [
                            {
                                property: 'valueName',
                                direction: 'ASC'
                            }
                        ]
                    }),
                    listeners: {
                        select: function(aCombo, aSelection) {
                            var value = aSelection.get('valueCode');
                            Repository.Local.current.hospital = value;
                            // console.log(
                            //     'hospital: ',
                            //     value,
                            //     value.toString().length
                            // );
                            Repository.Local.current.administration = value;
                            Repository.Local.current.management = _m.toManagementCode(
                                value
                            );
                            widget.dropdownRefresh(this, _m);
                        }
                    }
                },
                widget._chart,
                downloadPicBtn
            ]
        });
    }
});

//# sourceURL=SID/IndicatorsForQuarters
