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
                window.Stratum.containers['SID/IndicatorsForManagementKS']) ||
            'main-container';
        Repository.Local.Methods.initialize({
            initSampleSizes: function() {
                var db = Repository.Local.database,
                    pc = Repository.Local.current.period,
                    yc = Repository.Local.current.yearOfPeriod,
                    gc = parseInt(Repository.Local.current.gender, 10),
                    ic = Repository.Local.current.indicator,
                    curr = (Repository.Local.current.sizes = {
                        gcs: {},
                        pcs: {},
                        ycs: {},
                    });
                Ext.Array.forEach(db.Indicators, function(rc) {
                    if (rc.Indicator === ic && rc.Administration.length === 5) {
                        if (yc === rc.YearOfPeriod && pc === rc.Period) {
                            curr.gcs[rc.Gender] = curr.gcs[rc.Gender] || {
                                size: 0,
                            };
                            curr.gcs[rc.Gender].size += rc.Size;
                        }
                        if (rc.Gender === gc) {
                            if (yc === rc.YearOfPeriod) {
                                curr.pcs[rc.Period] = curr.pcs[rc.Period] || {
                                    size: 0,
                                };
                                curr.pcs[rc.Period].size += rc.Size;
                            }
                            if (pc === rc.Period) {
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
            getSampleSizes: function(sorttype) {
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
            getManagementValues: function() {
                var db = Repository.Local.database,
                    pc = Repository.Local.current.period,
                    yc = Repository.Local.current.yearOfPeriod,
                    gc = parseInt(Repository.Local.current.gender, 10),
                    ic = Repository.Local.current.indicator,
                    tv = Repository.Local.Methods.getIndicatorTargets(ic),
                    vc = [];

                Ext.Array.forEach(db.Indicators, function(rc) {
                    if (
                        rc.Indicator === ic &&
                        rc.Period === pc &&
                        rc.YearOfPeriod === yc &&
                        rc.Gender === gc &&
                        rc.Administration.length === 5
                    ) {
                        //TODO: should instatiate IndicatorModel instead ...
                        vc.push({
                            name: Repository.Local.Methods.mapManagementCodeToShortname(
                                rc.Administration
                            ),
                            management: rc.Administration,
                            measure: rc.Measure,
                            deviation: rc.Deviation,
                            size: rc.Size,
                            limitAbove: tv.LimitAbove,
                            limitBelow: tv.LimitBelow,
                        });
                    }
                });
                this.initSampleSizes();
                return vc.sort(function(a, b) {
                    return b.name.localeCompare(a.name);
                });
            },
            sizeRefresh: function(scope, sortType) {
                var sizes = this.getSampleSizes(sortType);
                scope.each(function(aRecord) {
                    aRecord.data.size = sizes[aRecord.data.valueCode]
                        ? sizes[aRecord.data.valueCode].size
                        : 0; // Add total sample size to each store record.
                });
            },
            dropdownRefresh: function(scope, _m) {
                var combos,
                    store = Ext.data.StoreManager.lookup(
                        'ManagementIndicatorStore'
                    );
                store && store.loadData(this.getManagementValues());
                combos = scope.ownerCt.query('combo');
                Ext.Array.each(combos, function(cc) {
                    !cc.isIndicatorCombo && cc.getStore().reload(); // Ensure that combo with itemTpl is reexecuted when combo list is opened.
                });
                _m.drawLimitRectangles(this._chart);
            },
            preInit: function() {
                Ext.fly(container).mask('Hämtar data ...');
            },
            init: function(_m) {
                var widget = this;
                Repository.Local.SORTTYPE = {
                    Hospital: 0,
                    Period: 1,
                    Year: 2,
                    Gender: 3,
                };
                //TODO: replace this with one generic model (in common methods).
                typeof ManagementIndicatorModel === 'undefined' &&
                    Ext.define('ManagementIndicatorModel', {
                        extend: 'Ext.data.Model',
                        fields: [
                            {
                                name: 'name',
                                type: 'string',
                                useNull: true,
                            },
                            {
                                name: 'management',
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
                var sampleSizeConfiguration = {
                    cls: 'WidgetListItem',
                    itemTpl: Ext.create(
                        'Ext.XTemplate',
                        '<span class="WidgetListItemInner" style="{[this.getStyle(values)]}">{valueName}</span>',
                        {
                            getStyle: function(aRecord) {
                                return typeof aRecord.size === 'undefined' ||
                                    aRecord.size > 0
                                    ? ''
                                    : 'color: #999';
                            },
                        }
                    ),
                };
                Ext.fly(container).unmask();

                Ext.create('Ext.data.Store', {
                    storeId: 'ManagementIndicatorStore',
                    model: 'ManagementIndicatorModel',
                    data: widget.getManagementValues(),
                    sorters: [
                        {
                            property: 'name',
                            direction: 'ASC',
                        },
                    ],
                });

                widget._chart = Ext.widget('exportChart', {
                    width: '100%',
                    height: 400,
                    border: true,
                    layout: 'fit',
                    padding: '8px 0',
                    plugins: {
                        ptype: 'chartitemevents',
                    },
                    animation: true,
                    animate: true,
                    store: Ext.data.StoreManager.lookup(
                        'ManagementIndicatorStore'
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
                        //Makes sure the rectangles are redrawn if the inner height has been changed in the chart surface
                        redraw: function(chart) {
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
                            title: 'Sjukhusförvaltningar',
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
                            tooltip: {
                                trackMouse: true,
                                dismissDelay: 0,
                                renderer: function(s, item) {
                                    if (!s) {
                                        return;
                                    }
                                    this.update(
                                        Ext.String.format(
                                            s.get('size')
                                                ? '{0}<br/>{1} observationer.<br/>{2}. Konfidensintervall &plusmn;{3}.'
                                                : '{0}<br/>{1} observationer.',
                                            _m.mapManagementCodeToName(
                                                s.get('management')
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
                                    Repository.Local.current.management = item.record.get(
                                        'management'
                                    );
                                    var hospitalNav = Ext.query(
                                        '.navbar-main-tab>a[href="/vaerden-per-sjukhus"]'
                                    )[0];
                                    if(hospitalNav) {
                                        hospitalNav.click();
                                    }
                                },
                            },
                            xField: 'name',
                            yField: 'measure',
                        },
                    ],
                });

                getPicBtn = Ext.create('Ext.Button', {
                    text: 'Hämta bild',
                    handler: function() {
                        /**
                         * @type {ExportChart}
                         */
                        var chart = widget._chart;
                        var today = new Date().toLocaleDateString();
                        var filename =
                            'Indikatorvärden_per_förvaltning-' + today + '.png';
                        // Get the text Items
                        // todo get the full name here..
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
                                        size: '9px',
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
                                titleCodeToName: function(value) {
                                    return _m.mapTitleCodeToName(value);
                                },
                                getInnerTpl: function() {
                                    return '<i>{title}</i><br/>{valueName}';
                                },
                            },
                            value: Repository.Local.current.indicator,
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
                                        data: _m.getPeriodCodeNamePairs(),
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
                                        data: _m.getPossibleYears(),
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
                                        data: _m.domainForStore(
                                            _m.mapGenderCodeToName
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
                        widget._chart,
                        getPicBtn,
                    ],
                });
            },
        });
    }
})();
//# sourceURL=SID/IndicatorsForManagementKS
