(function() {
    if (
        window.Repository &&
        window.Repository.Local &&
        window.Repository.Local.Methods &&
        window.Repository.Local.Methods.initializedMethods
    ) {
        init();
    } else {
        Ext.Ajax.request({
            url:
                '/stratum/api/metadata/registers/123',
            method: 'GET',
            params: {
                APIKey: 'bK3H9bwaG4o=',
            },
            callback: function(o, success, resp) {
                var data = Ext.decode(resp.responseText).data;

                var widgetScript = Ext.decode(data.WidgetScript);
                widgetScript.relURL = '/stratum/';
                // widgetScript.APIKey = 'bK3H9bwaG4o=';
                widgetScript.initializedMethods = true;

                window.Repository = { Local: { Methods: widgetScript } };
                window.Profile = window.Profile || {};
                init();
            },
        });
    }
    function init() {
        var container =
            (window.Stratum &&
                window.Stratum.containers &&
                window.Stratum.containers['SID/IndicatorsForHospitalKS']) ||
            'main-container';
        Repository.Local.Methods.initialize({
            initSampleSizes: function() {
                var db = Repository.Local.database,
                    pc = Repository.Local.current.period,
                    yc = Repository.Local.current.yearOfPeriod,
                    gc = parseInt(Repository.Local.current.gender, 10),
                    ic = Repository.Local.current.indicator,
                    mc = Repository.Local.current.management,
                    curr = (Repository.Local.current.sizes = {
                        vcs: {},
                        gcs: {},
                        pcs: {},
                        ycs: {},
                    }),
                    iwr,
                    ih,
                    currMan;

                Ext.Array.forEach(db.Indicators, function(rc) {
                    if (rc.Indicator === ic) {
                        ih =
                            rc.Administration.length === 6 &&
                            rc.Administration.indexOf(mc) === 0;
                        iwr = yc === rc.YearOfPeriod && pc === rc.Period;
                        if (
                            iwr &&
                            rc.Gender === gc &&
                            rc.Administration.length === 6
                        ) {
                            currMan = rc.Administration.substr(0, 5);
                            curr.vcs[currMan] = curr.vcs[currMan] || {
                                size: 0,
                            };
                            curr.vcs[currMan].size += rc.Size;
                        }
                        if (iwr && ih) {
                            curr.gcs[rc.Gender] = curr.gcs[rc.Gender] || {
                                size: 0,
                            };
                            curr.gcs[rc.Gender].size += rc.Size;
                        }
                        if (rc.Gender === gc && ih) {
                            if (yc === rc.YearOfPeriod) {
                                curr.pcs[rc.Period] = curr.pcs[rc.Period] || {
                                    size: 0,
                                };
                                curr.pcs[rc.Period].size += rc.Size;
                            }
                            if (rc.Period === pc) {
                                curr.ycs[rc.YearOfPeriod] = curr.ycs[
                                    rc.YearOfPeriod
                                ] || {
                                    size: 0,
                                };
                                curr.ycs[rc.YearOfPeriod].size += rc.Size;
                            }
                        }
                    }
                });
            },
            getSampleSizeByHospital: function(sorttype) {
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
            dropdownRefresh: function(scope, _m) {
                var combos,
                    store = Ext.data.StoreManager.lookup(
                        'HospitalIndicatorStore'
                    );
                store && store.loadData(this.getHospitalValues());
                combos = scope.ownerCt.query('combo');
                Ext.Array.each(combos, function(cc) {
                    !cc.isIndicatorCombo && cc.getStore().reload(); // Ensure that combo with itemTpl is reexecuted when combo list is opened.
                });
                _m.drawLimitRectangles(this._chart);
            },
            sizeRefresh: function(scope, sortType) {
                var sizes = this.getSampleSizeByHospital(sortType);
                scope.each(function(aRecord) {
                    aRecord.data.size = sizes[aRecord.data.valueCode]
                        ? sizes[aRecord.data.valueCode].size
                        : 0; // Add total sample size to each store record.
                });
            },
            getHospitalValues: function() {
                var db = Repository.Local.database,
                    pc = Repository.Local.current.period,
                    yc = Repository.Local.current.yearOfPeriod,
                    gc = parseInt(Repository.Local.current.gender, 10),
                    ic = Repository.Local.current.indicator,
                    mc = Repository.Local.current.management,
                    tv = Repository.Local.Methods.getIndicatorTargets(ic),
                    vc = [];

                Ext.Array.forEach(db.Indicators, function(rc) {
                    if (
                        rc.Indicator === ic &&
                        rc.Period === pc &&
                        rc.YearOfPeriod === yc &&
                        rc.Gender === gc &&
                        rc.Administration.length === 6 &&
                        rc.Administration.indexOf(mc) === 0
                    ) {
                        // Since hospital codes starts with the management code (first five digits)
                        //TODO: should instatiate IndicatorModel instead ...
                        vc.push({
                            name: Repository.Local.Methods.mapHospitalCodeToName(
                                rc.Administration
                            ),
                            hospital: rc.Administration,
                            measure: rc.Measure,
                            deviation: rc.Deviation,
                            size: rc.Size,
                            limitAbove: tv.LimitAbove,
                            limitBelow: tv.LimitBelow,
                        });
                    }
                });
                //  var time = window.performance && window.performance.now();
                this.initSampleSizes();
                //  time && console.log('Time taken: ' + (window.performance.now() - time));
                return vc.sort(function(a, b) {
                    return b.name.localeCompare(a.name);
                });
            },
            preInit: function() {
                Ext.fly(container).mask('Hämtar data ...');
            },
            init: function(_m) {
                var widget = this,
                    sampleSizeConfiguration = {
                        cls: 'WidgetListItem',
                        itemTpl: Ext.create(
                            'Ext.XTemplate',
                            '<span class="WidgetListItemInner" style="{[this.getStyle(values)]}">{valueName}</span>',
                            {
                                getStyle: function(aRecord) {
                                    return typeof aRecord.size ===
                                        'undefined' || aRecord.size > 0
                                        ? ''
                                        : 'color: #999';
                                },
                            }
                        ),
                    };
                Repository.Local.SORTTYPE = {
                    Hospital: 0,
                    Period: 1,
                    Year: 2,
                    Gender: 3,
                };
                //TODO: replace this with one generic model (in common methods).
                typeof HospitalIndicatorModel === 'undefined' &&
                    Ext.define('HospitalIndicatorModel', {
                        extend: 'Ext.data.Model',
                        fields: [
                            {
                                name: 'name',
                                type: 'string',
                                useNull: true,
                            },
                            {
                                name: 'hospital',
                                type: 'string',
                                useNull: true,
                            },
                            {
                                name: 'measure',
                                type: 'float',
                                useNull: true,
                            },
                            {
                                name: 'deviation',
                                type: 'float',
                                useNull: true,
                            },
                            {
                                name: 'size',
                                type: 'float',
                                useNull: true,
                            },
                            {
                                name: 'limitBelow',
                                type: 'float',
                                useNull: true,
                            },
                            {
                                name: 'limitAbove',
                                type: 'float',
                                useNull: true,
                            },
                        ],
                    });
                Ext.fly(container).unmask();

                Ext.create('Ext.data.Store', {
                    storeId: 'HospitalIndicatorStore',
                    model: 'HospitalIndicatorModel',
                    data: widget.getHospitalValues(),
                    sorters: [
                        {
                            property: 'name',
                            direction: 'ASC',
                        },
                    ],
                });

                widget._chart = Ext.widget('exportChart', {
                    renderTo: container,
                    width: '100%',
                    height: 400,
                    padding: '8px 0',
                    layout: 'fit',
                    border: true,
                    plugins: {
                        ptype: 'chartitemevents',
                    },
                    animation: true,
                    animate: true,
                    store: Ext.data.StoreManager.lookup(
                        'HospitalIndicatorStore'
                    ),
                    insetPadding: {
                        top: 25,
                        right: 20,
                        bottom: 20,
                        left: 20,
                    },
                    limitConfig: {
                        getLimitsFromStore: true,
                        limitAboveField: 'limitAbove',
                        limitBelowField: 'limitBelow',
                    },
                    listeners: {
                        // TODO: Bug in ExtJS where limit rectangles
                        redraw: function(chart, ev) {
                            try {
                                if (
                                    !chart._lastInnerRect ||
                                    chart.innerRect[3] !==
                                        chart._lastInnerRect[3]
                                ) {
                                    _m.drawLimitRectangles(chart);
                                }
                                chart._lastInnerRect = chart.innerRect;
                            } catch (e) {}
                        },
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
                            },
                        },
                        {
                            type: 'category',
                            position: 'bottom',
                            label: {
                                fontSize: 11,
                            },
                            title: 'Sjukhus i förvaltningen',
                        },
                    ],
                    series: [
                        {
                            type: 'bar',
                            axis: 'left',
                            highlight: {
                                strokeStyle: '#0d4267',
                                fillStyle: '#006298',
                                stroke: 'none',
                                opacity: 0.5,
                                cursor: 'pointer',
                            },
                            subStyle: {
                                strokeStyle: '#0d4267',
                                fillStyle: '#006298',
                                border: false,
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
                                            _m.mapHospitalCodeToName(
                                                s.get('hospital')
                                            ),
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
                                },
                            },
                            renderer: _m.kvartalenChartRenderer({
                                measure: 'deviation',
                            }),
                            listeners: {
                                itemmousedown: function(series, item) {
                                    Repository.Local.current.hospital = item.record.get(
                                        'hospital'
                                    );
                                    var quarterNav = Ext.query(
                                        '.navbar-main-tab>a[href="/vaerden-per-sjukhus-och-kvartal"]'
                                    )[0];
                                    if(quarterNav) {
                                        quarterNav.click();
                                    }
                                },
                            },
                            xField: 'name',
                            yField: 'measure',
                        },
                    ],
                });

                var downloadPicBtn = Ext.create('Ext.Button', {
                    text: 'Hämta bild',
                    handler: function() {
                        var chart = widget._chart;
                        var today = new Date().toLocaleDateString();
                        var filename =
                            'Indikatorvärden_per_sjukhus-' + today + '.png';
                        // Get the text Items
                        var indicatorText =
                            'Indikator: ' +
                            _m.mapTitleCodeToName(
                                Repository.Local.current.indicator
                            );
                        var indicatorSubText =
                            '                ' +
                            _m.mapIndicatorCodeToName(
                                Repository.Local.current.indicator
                            );
                        var timePeriod =
                            'Tidsperiod: ' +
                            _m.mapPeriodCodeToName(
                                Repository.Local.current.period
                            ) +
                            ' (' +
                            Repository.Local.current.yearOfPeriod +
                            ')';
                        var gender =
                            'Kön: ' +
                            _m.mapGenderCodeToName(
                                Repository.Local.current.gender
                            );

                        chart.generatePicture(
                            {
                                padding: 10,
                                header: {
                                    height: 22 * 4,
                                    items: [
                                        indicatorText,
                                        indicatorSubText,
                                        timePeriod,
                                        gender,
                                    ],
                                },
                                table: {
                                    height: 30,
                                    font: {
                                        size: '10px',
                                    },
                                    keys: [
                                        {
                                            title: 'Observationer',
                                            key: 'size',
                                        },
                                    ],
                                },
                            },
                            function(dataUrl) {
                                if (window.navigator.msSaveBlob) {
                                    window.navigator.msSaveBlob(
                                        dataUrl,
                                        filename
                                    );
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
                        );
                    },
                });

                // if (aMessage) {
                //TODO: inform user somehow that initialization has failed.
                // return;
                // }
                Ext.create('Ext.panel.Panel', {
                    renderTo: container,
                    width: '100%',
                    margin: '10px 0 20px 0',
                    border: false,
                    layout: {
                        type: 'vbox',
                    },
                    defaults: {
                        cls: 'WidgetFormItem',
                        editable: false,
                    },
                    items: [
                        {
                            xtype: 'combobox',
                            checkChangeEvents: Ext.isIE10p
                                ? ['change', 'propertychange', 'keyup']
                                : [
                                      'change',
                                      'input',
                                      'textInput',
                                      'keyup',
                                      'dragdrop',
                                  ],
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
                                },
                            },
                            listeners: {
                                select: function(aCombo, aSelection) {
                                    Repository.Local.current.indicator = aSelection.get(
                                        'valueCode'
                                    );
                                    widget.dropdownRefresh(aCombo, _m);
                                },
                            },
                        },
                        {
                            xtype: 'container',
                            margin: '8px 0 0 0',
                            bodyPadding: 0,
                            defaults: {
                                cls: 'WidgetFormItem',
                                editable: false,
                            },
                            layout: {
                                type: 'hbox',
                            },
                            width: '100%',
                            items: [
                                {
                                    xtype: 'combobox',
                                    checkChangeEvents: Ext.isIE10p
                                        ? ['change', 'propertychange', 'keyup']
                                        : [
                                              'change',
                                              'input',
                                              'textInput',
                                              'keyup',
                                              'dragdrop',
                                          ],
                                    flex: 1,
                                    padding: '0 5px 0 0',
                                    emptyText: 'Välj period ...',
                                    store: Ext.create('Ext.data.Store', {
                                        fields: ['valueCode', 'valueName'],
                                        data: Repository.Local.Methods.getPeriodCodeNamePairs(),
                                        listeners: {
                                            datachanged: function() {
                                                widget.sizeRefresh(
                                                    this,
                                                    Repository.Local.SORTTYPE
                                                        .Period
                                                );
                                            },
                                        },
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
                                        },
                                    },
                                },
                                {
                                    xtype: 'combobox',
                                    checkChangeEvents: Ext.isIE10p
                                        ? ['change', 'propertychange', 'keyup']
                                        : [
                                              'change',
                                              'input',
                                              'textInput',
                                              'keyup',
                                              'dragdrop',
                                          ],
                                    width: 110,
                                    padding: '0 5px 0 0',
                                    labelWidth: 20,
                                    fieldLabel: 'för',
                                    emptyText: 'Välj årtal ...',
                                    store: Ext.create('Ext.data.Store', {
                                        fields: ['valueCode', 'valueName'],
                                        data: Repository.Local.Methods.getPossibleYears(),
                                        listeners: {
                                            datachanged: function() {
                                                widget.sizeRefresh(
                                                    this,
                                                    Repository.Local.SORTTYPE
                                                        .Year
                                                );
                                            },
                                        },
                                    }),
                                    queryMode: 'local',
                                    displayField: 'valueName',
                                    valueField: 'valueCode',
                                    listConfig: sampleSizeConfiguration,
                                    value:
                                        Repository.Local.current.yearOfPeriod,
                                    listeners: {
                                        select: function(aCombo, aSelection) {
                                            Repository.Local.current.yearOfPeriod = aSelection.get(
                                                'valueCode'
                                            );
                                            widget.dropdownRefresh(aCombo, _m);
                                        },
                                    },
                                },
                                {
                                    xtype: 'combobox',
                                    checkChangeEvents: Ext.isIE10p
                                        ? ['change', 'propertychange', 'keyup']
                                        : [
                                              'change',
                                              'input',
                                              'textInput',
                                              'keyup',
                                              'dragdrop',
                                          ],
                                    width: 170,
                                    emptyText: 'Välj kön ...',
                                    store: Ext.create('Ext.data.Store', {
                                        //TODO: use domainForStore in local script to generate store.
                                        fields: ['valueCode', 'valueName'],
                                        data: Repository.Local.Methods.domainForStore(
                                            Repository.Local.Methods
                                                .mapGenderCodeToName
                                        ),
                                        listeners: {
                                            datachanged: function() {
                                                widget.sizeRefresh(
                                                    this,
                                                    Repository.Local.SORTTYPE
                                                        .Gender
                                                );
                                            },
                                        },
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
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            xtype: 'combobox',
                            checkChangeEvents: Ext.isIE10p
                                ? ['change', 'propertychange', 'keyup']
                                : [
                                      'change',
                                      'input',
                                      'textInput',
                                      'keyup',
                                      'dragdrop',
                                  ],
                            width: '100%',
                            margin: '8px 1px 0 0',
                            fieldLabel: 'Sjukhusförvaltningar',
                            labelWidth: 140,
                            emptyText: 'Välj förvaltning ...',
                            store: Ext.create('Ext.data.Store', {
                                fields: ['valueCode', 'valueName'],
                                data: Repository.Local.Methods.domainForStore(
                                    Repository.Local.Methods
                                        .mapManagementCodeToName
                                ),
                                listeners: {
                                    datachanged: function() {
                                        widget.sizeRefresh(
                                            this,
                                            Repository.Local.SORTTYPE.Hospital
                                        );
                                    },
                                },
                                sorters: [
                                    {
                                        property: 'valueName',
                                        direction: 'ASC',
                                    },
                                ],
                            }),
                            displayTpl:
                                '<tpl for=".">' +
                                "{[Ext.isString(values.valueName) ? values.valueName.replace('&shy;','') : '']}" +
                                '</tpl>',
                            queryMode: 'local',
                            listConfig: sampleSizeConfiguration,
                            valueField: 'valueCode',
                            value: Repository.Local.current.management,
                            listeners: {
                                select: function(aCombo, aSelection) {
                                    var value = aSelection.get('valueCode');
                                    Repository.Local.current.management = value;
                                    Repository.Local.current.administration = value;
                                    Repository.Local.current.hospital = parseInt(
                                        value + '1',
                                        10
                                    );
                                    widget.dropdownRefresh(aCombo, _m);
                                },
                            },
                        },
                        widget._chart,
                        downloadPicBtn,
                    ],
                });
            },
        });
    }
})();
//# sourceURL=SID/IndicatorsForHospitalKS
