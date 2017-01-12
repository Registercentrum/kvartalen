! function() {
    var s;
    var Kvartalen = {
        settings: {
            relUrl: '//stratum.registercentrum.se',
            widgetUrl: '//stratum.registercentrum.se/api/metadata/pages/{0}',
            // widgetUrl: '//rcutv.rcvg.local',
            APIKey: 'bK3H9bwaG4o=',
            containerId: 'main-container'
        },
        init: function() {
            s = this.settings;
            if (typeof Ext === 'undefined') {
                return;
            }
            // this.overrideConnection();
            // this.shrinkRCMenu();
            this.loadSIDCss();
            window.Repository = window.Repository || {
                Local: {
                    Methods: Ext.apply(window.Stratum.SID, {
                        relURL: s.relUrl,
                        APIKey: s.APIKey
                    })
                }
            };
            window.Profile = window.Profile || {};

            //Needed for CORS Ajax to work in IE <=8. and 9?
            Ext.define('Kvartalen.override.Ajax', {
                override: 'Ext.Ajax',
                request: function(options) {
                    Ext.applyIf(options, {
                        cors: true
                    });
                    this.callParent([options]);
                }
            });
            Ext.tip.QuickTipManager.init(true, {
                dismissDelay: 0
            });
            Kvartalen.hashChange();
            if (window.addEventListener) {
                window.addEventListener('hashchange', Kvartalen.hashChange, false);
            } else if (window.attachEvent) {
                window.attachEvent('onhashchange', Kvartalen.hashChange);
            }
            Kvartalen.initGoogleAnalytics();
        },
        trackWidgetView: function(id) {
            var widgetName;
            switch (id) {
                case '1274':
                    widgetName = 'SID/EffectivenessGrid';
                    break;
                case '1275':
                    widgetName = 'SID/IndicatorsForManagement';
                    break;
                case '1276':
                    widgetName = 'SID/IndicatorsForHospital';
                    break;
                case '1322':
                    widgetName = 'SID/IndicatorsForQuarters';
                    break;
                default:
                    break;
            }
            if (widgetName && typeof ga !== 'undefined') {
                ga('send', 'event', 'Widget', 'Sidvisning med widget', widgetName);
            }
        },
        sidCorsCallback: function(responseText, container, id) {
            data = Ext.decode(responseText);
            var mainContainer = Ext.get(container);
            this.purgeOrphans(mainContainer);
            mainContainer && mainContainer.setHtml(data.data.PageContent, true);
            //Overwrite standard navigation function...
            window.Repository.Local.Methods.navigateToPage = function(id) {
                if (Ext.isNumeric(id)) {
                    window.location.hash = '#' + id;
                }
            };
            Kvartalen.trackWidgetView(id);
        },
        loadStratumPage: function(id, container) {

            var url = Ext.String.format(s.widgetUrl + '?APIKey={1}', id, s.APIKey);

            Ext.Ajax.request({
                url: url,
                method: 'get',
                cors: true,
                failure: function() {
                    // console.log('faaaaail');
                },
                success: function(resp, o) {
                    var data;

                    Kvartalen.sidCorsCallback(resp.responseText, container, id);
                }
            });

        },
        hashChange: function() {
            var hash = window.location.hash;
            if ((/^#[1-9][0-9]{3}$/).test(hash)) {
                Kvartalen.loadStratumPage(hash.substring(1, 5), s.containerId);
            }
        },
        loadSIDCss: function() {
            Ext.util.CSS.createStyleSheet(
                '.WidgetFormItem input {'+
                '   font-size: 14px;'+
                '   padding: 4px 6px 3px 6px;'+
                '}'+
                '.info-container {' +
                '   margin: 20px 0;' +
                '   padding: 20px;' +
                '   border-left: 3px solid #bbb;' +
                '   background: #f5f5f5;' +
                '}' +
                '.info-container h4 {' +
                '   color: #bbb;' +
                '   margin-top: 0;' +
                '   margin-bottom: 5px;' +
                '   font-size: 18px;' +
                '   font-weight: normal;' +
                '}' +
                '.info-container p:last-child{' +
                '   margin-bottom: 0;' +
                '}'+
                '@media print {' +
                '    body * {' +
                '        visibility: hidden;' +
                '    }' +
                '    #main-container {' +
                '        position: absolute;' +
                '        left: 0;' +
                '        top: 0;' +
                '    }' +
                '    #main-container * {' +
                '        visibility: visible;' +
                '    }' +
                '    .HeatGridValueNotRegister img,' +
                '    .HeatGridValueML img,' +
                '    .HeatGridValueUL img,' +
                '    .HeatGridValueLL img {' +
                '        display: block !important;' +
                '        margin-left: 1pt;' +
                '    }' +
                '    .HeatGrid,' +
                '    .HeatGrid .x-panel-body,' +
                '    .HeatGrid .x-grid-view,' +
                '    .HeatGrid table,' +
                '    .HeatGrid tbody {' +
                '        height: auto !important;' +
                '    }' +
                '    .HeatGrid .x-grid-view {' +
                '        overflow: hidden !important;' +
                '    }' +
                '    .HeatGrid .x-panel-body {' +
                '        margin-bottom: 50px;' +
                '    }' +
                '    .HeatGrid .x-grid-header-ct {' +
                '        top: auto !important;' +
                '    }' +
                '    .legend-img {' +
                '        display: block !important;' +
                '        width: 10px;' +
                '        height: 10px;' +
                '        margin: 0;' +
                '        padding: 0;' +
                '        float: left;' +
                '    }' +
                '    .hide-print {' +
                '        display: none;' +
                '    }' +
                '}');
            if (Ext.isIE8) {
                Ext.util.CSS.createStyleSheet(
                    ' @media print {' +
                    '   #main-container {' +
                    '     width: 750px;' +
                    '     position: static;' +
                    '     left: auto;' +
                    '     top: auto;' +
                    '   }' +
                    '   #header, #banner1, .ibiz-sidebar1, .region-navigation,' +
                    '   .ibiz-slogan, .ibiz-logo, .ibiz-search, .region-footer-message  {' +
                    '     display: none !important;' +
                    '     visibility: hidden !important;' +
                    '     height: 0 !important;' +
                    '     width: 0 !important;' +
                    '   }' +
                    ' }');
            }
        },
        initGoogleAnalytics: function() {
            (function(i, s, o, g, r, a, m) {
                i['GoogleAnalyticsObject'] = r;
                i[r] = i[r] || function() {
                    (i[r].q = i[r].q || []).push(arguments)
                }, i[r].l = 1 * new Date();
                a = s.createElement(o),
                    m = s.getElementsByTagName(o)[0];
                a.async = 1;
                a.src = g;
                m.parentNode.insertBefore(a, m)
            })(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');
            ga('create', 'UA-19212000-1', 'registercentrum.se');
        },
        purgeOrphans: function(aContainer) {
            var cp = Ext.isElement(aContainer) ? aContainer : (aContainer.isComponent ? aContainer.el.dom : aContainer.dom),
            me = this;
            if (cp.children.length > 0) {
                Ext.Array.each(cp.children, function(ce) {
                    var cc;
                    cc = Ext.ComponentManager.get(ce.id);
                    if (cc) {
                        cc.destroy();
                    }
                    //Has to come in this order in order for IE8 to destroy elements correctly
                    if (ce.children.length > 0) {
                        me.purgeOrphans(ce);
                    }
                    if (!cc) {
                        me.purgeElement(ce);
                    }
                });
            }
        },
        purgeElement: function(elem) {
            var co;
            if (elem && elem.id) {
                co = Ext.cache[elem.id];
                if (co) {
                    co.el.destroy();
                }
            }
        },
        overrideConnection: function(){
            Ext.define("MyApp.data.Connection",{override:"Ext.data.Connection",onStateChange:function(e,t){var s=this,c=Ext.GlobalEvents;(e.xhr&&4==e.xhr.readyState||s.getIsXdr())&&(s.clearTimeout(e),s.onComplete(e,t),s.cleanup(e),c.hasListeners.idle&&c.fireEvent("idle"))},onComplete:function(e,t){var s,c,a,n,o=this,r=e.options;try{s=e.xhr,c=o.parseStatus(s.status),c.success&&(c.success=4===s.readyState)}catch(i){c={success:!1,isException:!1}}return a=o.getIsXdr()?t:c.success,a?(n=o.createResponse(e),o.fireEvent("requestcomplete",o,n,r),Ext.callback(r.success,r.scope,[n,r])):(n=c.isException||e.aborted||e.timedout?o.createException(e):o.createResponse(e),o.fireEvent("requestexception",o,n,r),Ext.callback(r.failure,r.scope,[n,r])),Ext.callback(r.callback,r.scope,[r,a,n]),delete o.requests[e.id],n}});
        },
        shrinkRCMenu: function(){
            Ext.select('.ibiz-sidebar1').setWidth(170, true);
        }
    };
    Kvartalen.init();
}();
//# sourceURL=SID/KvartalenLoader
