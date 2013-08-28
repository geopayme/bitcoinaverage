var legendSlots = 20;
var API_data = {};
if (typeof config.apiIndexUrl == 'undefined' || config.apiIndexUrl == ''){
    alert('API URL config value empty!');
}
if (config.apiIndexUrl[config.apiIndexUrl.length-1] != '/') {
    config.apiIndexUrl = config.apiIndexUrl + '/';
}
var API_all_url = config.apiIndexUrl+'all';

if (config.apiIndexUrlNoGox[config.apiIndexUrlNoGox.length-1] != '/') {
    config.apiIndexUrlNoGox = config.apiIndexUrlNoGox + '/';
}
var API_all_url_nogox = config.apiIndexUrlNoGox+'all';

var active_API_URL = API_all_url;

var legendClickStatus = false;
var firstRenderDone = false;
var fiatExchangeRates = [];
$(function(){
    callAPI();
    setInterval(callAPI, config.refreshRate);
    setInterval(renderSecondsSinceUpdate, 5000);

    $('#legend-block').click(function(event){
        event.stopPropagation();
    });

    $('#nogox-button').click(function(event){
        var button = $(this);
        if (active_API_URL == API_all_url){
            active_API_URL = API_all_url_nogox;
            $(this).removeClass('btn-default');
            $(this).addClass('btn-primary');
            button.html('MTGox ignored for USD/EUR/GBP');
        } else {
            active_API_URL = API_all_url;
            $(this).addClass('btn-default');
            $(this).removeClass('btn-primary');
            button.html('ignore MTGox for USD/EUR/GBP');
        }
        callAPI();
    });

    for(var slotNum in config.currencyOrder){
        $('#slot'+slotNum+'-last, #slot'+slotNum+'-ask, #slot'+slotNum+'-bid').dblclick(function(event){
            event.preventDefault();
            $(this).selectText();
        });

        var slotLegendBox = $('#slot'+slotNum+'-box');
        slotLegendBox.mouseover(function(event){
            var curCode = $(this).data('currencycode');
            renderLegend(curCode);
            $('#currency-navtabs').children('li').removeClass('active');
            $(this).addClass('active');
        });
        slotLegendBox.mouseout(function(event){
            $('#currency-navtabs').children('li').removeClass('active');
            if (legendClickStatus != false) {
                renderLegend(legendClickStatus);
                $('#currency-navtabs').children('li[data-currencycode="'+legendClickStatus+'"]').addClass('active');
            }
        });
        slotLegendBox.click(function(event){
            event.preventDefault();
            event.stopPropagation();
            var curCode = $(this).data('currencycode');
            if (legendClickStatus == false || legendClickStatus != curCode) {
                renderLegend(curCode);
                legendClickStatus = curCode;

                $('#currency-navtabs').children('li').removeClass('active');
                $('#currency-navtabs').children('li[data-currencycode="'+legendClickStatus+'"]').addClass('active');
                $('#currency-sidebar li').removeClass('active');
                $('#currency-sidebar li[data-currencycode="'+legendClickStatus+'"]').addClass('active');

                var currentHash = window.location.hash;
                var currentLocation = document.location.href;
                var newLocation = currentLocation.replace(currentHash, '')+'#'+curCode;
                window.location.replace(newLocation);
            }
        });

        var slotLegendLink = $('#slot'+slotNum+'-link');
        slotLegendLink.mouseover(function(event){
            var curCode = $(this).data('currencycode');
            renderLegend(curCode);
            $('#currency-sidebar li').removeClass('active');
            $(this).addClass('active');
        });
        slotLegendLink.mouseout(function(event){
            $('#currency-sidebar li').removeClass('active');
            if (legendClickStatus != false) {
                renderLegend(legendClickStatus);
                $('#currency-sidebar li[data-currencycode="'+legendClickStatus+'"]').addClass('active');
            }
        });
        slotLegendLink.click(function(event){
            event.preventDefault();
            event.stopPropagation();
            var curCode = $(this).data('currencycode');
            if (legendClickStatus == false || legendClickStatus != curCode) {
                legendClickStatus = curCode;
                renderLegend(curCode);

                $('#currency-navtabs').children('li').removeClass('active');
                $('#currency-navtabs').children('li[data-currencycode="'+legendClickStatus+'"]').addClass('active');
                $('#currency-sidebar li').removeClass('active');
                $('#currency-sidebar li[data-currencycode="'+legendClickStatus+'"]').addClass('active');

                var currentHash = window.location.hash;
                var currentLocation = document.location.href;
                var newLocation = currentLocation.replace(currentHash, '')+'#'+curCode;
                window.location.replace(newLocation);
            }
        });

    }

    $("#question-mark").tooltip({
        'trigger':'click',
        'html': $(this).data('original-title'),
        'placement': 'left'
    });

});

function callAPI(){
    if (window.XDomainRequest) {
        var xhr = new window.XDomainRequest();
        xhr.open('GET', active_API_URL, true);
        xhr.onload = function() {
            var result = JSON.parse(xhr.responseText);
            renderAll(result);
        };
        xhr.send();
    } else {
        $.getJSON(active_API_URL, renderAll);
    }
}

function renderAll(result){
    API_data = result;

//            config.currencyOrder.sort(function(a,b){
//                result[a].total_volume_btc = 0;
//                for (var exchange in result[a].exchanges){
//                    result[a].total_volume_btc += parseInt(result[a].exchanges[exchange].volume_btc);
//                }
//
//                result[b].total_volume_btc = 0;
//                for (var exchange in result[b].exchanges){
//                    result[b].total_volume_btc += parseInt(result[b].exchanges[exchange].volume_btc);
//                }
//                if (result[a].total_volume_btc<result[b].total_volume_btc) {
//                    return 1;
//                } else {
//                    return -1;
//                }
//            });

    $('#currency-sidebar li[id^="slot"] a').hide();

    for(var slotNum in config.currencyOrder){
        var currencyCode = config.currencyOrder[slotNum];
        renderRates(currencyCode, result[currencyCode], slotNum);
    }

    renderSecondsSinceUpdate();
    if (!firstRenderDone) {
        $('body').show();
        var currentHash = window.location.hash;
        currentHash = currentHash.replace('#', '');
        if (currentHash != '' && $('#currency-sidebar li[data-currencycode="'+currentHash+'"]').size() > 0) {
            $('#currency-sidebar li[data-currencycode="'+currentHash+'"]').click();
        } else {
            $('#slot0-box').click();
        }

        firstRenderDone = true;
    }

    if (legendClickStatus != false){
        document.title = API_data[legendClickStatus].averages.last+' '+legendClickStatus+' - BitcoinAverage';
    } else {
        document.title = API_data['USD'].averages.last+' USD - BitcoinAverage';
    }
}

var lastusdvalue = 0;
function renderRates(currencyCode, currencyData, slotNum){
    $('#slot'+slotNum+'-link').attr('data-currencycode', currencyCode);
    $('#slot'+slotNum+'-link a').text(currencyCode);
    $('#slot'+slotNum+'-link a').attr('href', '#'+currencyCode);
    $('#slot'+slotNum+'-link a').show();
    $('#slot'+slotNum+'-box').attr('data-currencycode', currencyCode);
    $('#slot'+slotNum+'-curcode').text(currencyCode);

    var dataChanged = false;
    dataChanged = (dataChanged || $('#slot'+slotNum+'-last').text() != currencyData.averages.last);
    dataChanged = (dataChanged || $('#slot'+slotNum+'-ask').text() != currencyData.averages.ask);
    dataChanged = (dataChanged || $('#slot'+slotNum+'-bid').text() != currencyData.averages.bid);
    $('#slot'+slotNum+'-last').text(currencyData.averages.last);
    $('#slot'+slotNum+'-ask').text(currencyData.averages.ask);
    $('#slot'+slotNum+'-bid').text(currencyData.averages.bid);

    if (currencyCode == "USD") {
        if (lastusdvalue == 0) {
            lastusdvalue = currencyData.averages.last;
        } else {
            if (currencyData.averages.last > lastusdvalue) {
                $('#usd-arrowup').show();
                $('#usd-arrowdown').hide();
            } else if (currencyData.averages.last < lastusdvalue) {
                $('#usd-arrowup').hide();
                $('#usd-arrowdown').show();
            }
            lastusdvalue = currencyData.averages.last;
        }
    }

    if (dataChanged) {
        var flashingFigures = $('#slot'+slotNum+'-last, #slot'+slotNum+'-ask, #slot'+slotNum+'-bid');
        flashingFigures.css({ 'opacity' : 0.5});
        flashingFigures.animate({ 'opacity' : 1 }, 500);
    }
}

function renderLegend(currencyCode){
    var exchangeArray = [];
    var currencyData = API_data[currencyCode];

    var index = 0;
    for(var exchange_name in currencyData.exchanges){
        currencyData.exchanges[exchange_name]['name'] = exchange_name;
        exchangeArray[index] = currencyData.exchanges[exchange_name];
        index++;
    }

    exchangeArray.sort(function(a, b){
        if(parseFloat(a.volume_percent) < parseFloat(b.volume_percent)){
            return 1;
        } else {
            return -1;
        }
    });

    if (legendClickStatus == currencyCode){
        document.title = API_data[currencyCode].averages.last+' '+currencyCode+' - BitcoinAverage';
    }

    $('.legend-curcode').text(currencyCode);
    $('#legend-last').html(currencyData.averages.last);
    $('#legend-bid').html(currencyData.averages.bid);
    $('#legend-ask').html(currencyData.averages.ask);
    $('#legend-total-volume').html(currencyData.averages.total_vol);

    $('#legend-ignored-table').hide();
    if ($(API_data.ignored_exchanges).countObj() > 0) {
        $('#legend-ignored-table').show();
        $('#legend-ignored-table tr[id^="legend-ignored-slot"]').hide();
        var index = 0;
        for (var exchange_name in API_data.ignored_exchanges) {
            $('#legend-ignored-slot'+index+'-name').text(exchange_name);
            $('#legend-ignored-slot'+index+'-reason').text(API_data.ignored_exchanges[exchange_name]);
            $('#legend-ignored-slot'+index+'-box').show();
            index++;
        }
    }

    var USD_BTC_fiat_rate = parseFloat(API_data['USD'].averages.last) * parseFloat(fiatCurrencies[currencyCode]);
    USD_BTC_fiat_rate = Math.round(USD_BTC_fiat_rate*100)/100;
    $('#legend-converted-to-USD').html(USD_BTC_fiat_rate);

    for(var slotNum=0;slotNum<legendSlots;slotNum++){
        $('#legend-slot'+slotNum).toggle(false);
    }
    $('#legend-other').toggle(false);

    var otherCount = 0;
    var otherPercent = 0;
    var otherVolume = 0;

    $('#legend-api-unavailable-note').hide();
    $('#legend-api-down-note').hide();
    for(var slotNum in exchangeArray){
        if (exchangeArray[slotNum]['source'] == 'cache') {
            exchangeArray[slotNum]['name'] = exchangeArray[slotNum]['name'] + '**';
            $('#legend-api-down-note').show();
        } else if (exchangeArray[slotNum]['source'] == 'bitcoincharts') {
            exchangeArray[slotNum]['name'] = exchangeArray[slotNum]['name'] + '*';
            $('#legend-api-unavailable-note').show();
        }


        if(slotNum<legendSlots){
            $('#legend-slot'+slotNum+'-name').text(exchangeArray[slotNum]['name']);
            $('#legend-slot'+slotNum+'-volume_btc').text(exchangeArray[slotNum]['volume_btc']);
            $('#legend-slot'+slotNum+'-volume_percent').text(exchangeArray[slotNum]['volume_percent']);
            $('#legend-slot'+slotNum+'-rate').text(exchangeArray[slotNum]['rates']['last']);
            $('#legend-slot'+slotNum).toggle(true);
        } else {
            otherCount = otherCount+1;
            otherPercent = otherPercent+exchangeArray[slotNum]['volume_percent'];
            otherVolume = otherVolume+exchangeArray[slotNum]['volume_btc'];
        }
    }
    if(otherCount > 0){
        $('#slot'+slotNum+'-subslot-other').toggle(true);
        $('#slot'+slotNum+'-subslot-other-count').text(otherCount);
        $('#slot'+slotNum+'-subslot-other-volume_btc').text(otherVolume);
        $('#slot'+slotNum+'-subslot-other-volume_percent').text(otherPercent);
    }
}

function renderSecondsSinceUpdate(){
    var currentTimestamp = Math.round(new Date().getTime()/1000);
    var dataTimestamp = Math.round(Date.parse(API_data['timestamp'])/1000);
    $('#legend-update-seconds-ago').html(currentTimestamp-dataTimestamp);
}

jQuery.fn.selectText = function(){
    var doc = document
        , element = this[0]
        , range, selection
    ;
    if (doc.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToElementText(element);
        range.select();
    } else if (window.getSelection) {
        selection = window.getSelection();
        range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
    }
};

jQuery.fn.countObj = function(){
    var count = 0;
    var obj = this[0];
    for (i in obj) {
        if (obj.hasOwnProperty(i)) {
            count++;
        }
    }
    return count;
}

