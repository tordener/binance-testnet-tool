/*
    DEPENDENCIES
*/

const crypto = require('crypto');

/*
    GLOBAL VARS
*/

const symbol = process.env.SYMBOL;
const url = process.env.URL;
const url2 = process.env.URL_V2
const recv = process.env.RECVWINDOW;
const ttl = process.env.TTL;
const api_key = process.env.API_KEY;
const secret_key = process.env.SECRET_KEY;
const trade_size = process.env.TRADE_SIZE;
const sample = process.env.SAMPLE;
const timeinforce = process.env.TIME_IN_FORCE;
const trade_fee = process.env.FEE;


/*
    TOOLS
*/



/**
 * Calls the /depth endpoint and returns an object containing shortened arrays with the price points 
 *     and associated volumes nearest the current market price
 * @param {int} range How many price points above and below market price to return
 * @returns {json} {above_mkt: [...], below_mkt: [...]}
 */
async function cropDepth(range){
    let mkt_depth = await book();
    let depth_bids = mkt_depth.bids;
    let depth_asks = mkt_depth.asks;
    let above_mkt = [];
    let below_mkt = [];
    let spread = {above_mkt, below_mkt};

    if(typeof range == "undefined"){
        above_mkt.push(depth_asks);
        below_mkt.push(depth_bids);
    }else{
        for(var a = 0; a < range; a++){
            above_mkt.push(depth_asks[a]);
            below_mkt.push(depth_bids[a]);
         }
    }
    return spread;
}


/**
* Snipe tries to get in or out of a trade as close to the market price as possible,
* The user specifies the acceptable loss parameter (how great of a difference from market price), and it will search for entry/exit points
* that are within that value
* - CURRENTLY INCOMPLETE/NON-FUNCTIONAL
* --
* ---
* @param {boolean} direction - The side of the originating order (true for buy, false for sell)
* @param {float} acceptable_loss - Acceptable difference from market price
* @returns {void} Doesn't return shit
*/
async function snipe(direction, acceptable_loss){
    let side;
    (direction ? side = 'SELL' : side = 'BUY');
    let mkt_price = await price();
    mkt_price = parseFloat(mkt_price);
    let fee = mkt_price * 0.002;
    console.log(fee); // debug
    let positions = await risk();
    let position_side = positions.positionSide;
    let profit = positions.unrealizedProfit - fee;
    let entry = positions.entryPrice;
    let orders = await book(0,!direction);
    let min = Math.min(...orders);

    if(direction){
        if(positions.positionAmt > 0){
            if((min - fee) > profit){
                await order(side, min);
            }
        }
    }
}


/*
    API FUNCTIONS
*/


/**
 * Returns the spread and volume for bids/asks, and the market price
 * @returns {json}
 */
async function spread(){
    const response = await fetch(`${url}/ticker/bookTicker?symbol=${symbol}`);
    const data = await response.json();
    return data;
}


/**
 * Gets market depth for bids and asks
 * @returns {json}
 */
async function book(){
    const response = await fetch(`${url}depth?symbol=${symbol}`);
    return await response.json();
}


/**
 * Gets the current market price for the symbol specified in the environment file
 * @param {boolean} show true will just log the price to the console 
 * @returns {json}
 */
async function price(show){
    const response = await fetch(`${url}/ticker/price?symbol=${symbol}`);
    const data = await response.json();

    if(show){
        console.log(data.price);
    }
    return data.price;
}


/**
 * Returns recent trades executed for that symbol. The amount of recent trades can be
 * specified using the SAMPLE_SIZE environment variable
 * @param {boolean} show 
 * @returns {json} TID-BIT: Response object will return the trades in chronological order, starting with the oldest trade in the array for the specified number of trades
 */
async function trades(show){
    const response = await fetch(`${url}trades?symbol=${symbol}&limit=${sample}`);
    const data = await response.json();

    if(show){
        console.log(data);
    }
    return data;
}


/**
 * Returns the candlestick data of a range in time
 *  - set start_time or end_time eqaul to 0 if you just want most recent candlestick data
 * @param {string} interval The timeframe ex: "1m" = 1 minute candles, "1M" = 1 month candles
 * @param {int} start_time The beginning of the dataset (unix time in ms)
 * @param {int} end_time The ending of the dataset (unix time in ms)
 * @param {int} limit How many candles to return - should match the start/end interval if using start and end times
 ** ex:
 ** - start - end = 30 minutes
 **  - interval = 1m
 **   - limit = 30
 * @returns {array} [[Open time (0): int, Open (1): string (decimal), High (2): string (decimal), Low (3): string (decimal), Close (4): string (decimal), Volume (5): string (decimal), Close time (6): int, Quote asset volume (7): string (decimal), Number of trades (8): int, Taker buy base asset volume (9): String (decimal), Taker buy quote asset volume (10): string (decimal), Ignore (11): string (decimal)], [...]...]
 */
 async function candles(interval, start_time, end_time, limit){
    if((start_time == 0) || (end_time == 0)){
        let string = `${url}klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        const response = await fetch(string)
        let data = await response.json();
        console.log(data);
        return data;
    }else{
        let string = `${url}klines?symbol=${symbol}&interval=${interval}&startTime=${start_time}&endTime=${end_time}&limit=${limit}`;
        const response = await fetch(string)
        let data = await response.json();
        console.log(data);
        return data;
    }
}


/**
 * Places an order for the specified symbol at the specified price.
 * Time in force can be changed from good until cancelled "GTC" or "IOC" immediately or cancel in the environment variable
 * TIME_IN_FORCE
 * @param {string} side "BUY" for a buy, "SELL" to sell. - considering changing this to a boolean
 * @param {float} price the price at which the order is to be filled
 * @returns {void}
 */
async function order(side,price){
    let query_string = `${url}order?symbol=${symbol}&side=${side}&type=${type}&timeInForce=${timeinforce}&quantity=${trade_size}&price=${price}&recvWindow=${recv}&timestamp=${Date.now()}`;
    let signature = crypto.createHmac('sha256', secret_key).update(query_string).digest('hex');
    query_string = `${query_string}&signature=${signature}`;
    fetch(query_string, {
        method: 'POST',
        headers: {'X-MBX-APIKEY': api_key}
    })
    .then(response => response.json())
    .then(json => console.log(json))
    .catch(err => console.log(err));
}


/**
 * Returns the open orders list on the binance account
 * @param {boolean} show true will just print the orders to the console 
 * @returns {json}
 */
async function orders(show){
    let string = `symbol=${symbol}&recvWindow=${recv}&timestamp=${Date.now()}`;
    let signature = crypto.createHmac('sha256', secret_key).update(string).digest('hex');
    string = string + '&signature=' + signature;
    const response = await fetch(`${url}openOrders?${string}`, {method: 'GET', headers: {'X-MBX-APIKEY' : api_key}});
    const data = await response.json();
    
    if(show){
        console.log(data);
    }
    return data;
}


/**
 * Cancels an order based on order ID
 * @param {int} order_id the order ID of the order to be cancelled. Order ID can be obtained from the orders() function
 * @returns {json}
 */
async function cancelOrder(order_id){
    let string = `symbol=${symbol}&orderId=${order_id}}&timestamp=${Date.now()}`;
    let signature = crypto.createHmac('sha256', secret_key).update(string).digest('hex');
    string = `${url}order?${string}&signature=${signature}`;
    const response = await fetch(string, {method: 'DELETE', headers: {'X-MBX-APIKEY' : api_key}});
    const data = await response.json();
    return data;
}


/**
 * Returns the open positions list
 * @returns {json}
 */
async function risk(){
    let string = `symbol=${symbol}&recvWindow=${recv}&timestamp=${Date.now()}`;
    let signature = crypto.createHmac('sha256', secret_key).update(string).digest('hex');
    string = string + `&signature=${signature}`;
    const response = await fetch(`${url}positionRisk?${string}`, {method: 'GET', headers: {'X-MBX-APIKEY' : api_key}});
    const data = await response.json();
    let amount = data[0].positionAmt;
    amount = parseFloat(amount);
    return data;
}


/**
 * returns an array of objects containing balance of base assets associated to the account
 * @returns {array} json
 ** -
 * ex: [{accountAlias: string, asset: string, balance: string (decimal), crossWalletBalance: string (decimal), crossUnPnl: string (decimal), availableBalance: strng (decimal), maxWithdrawAmount: string (decimal), marginAvailable: boolean, updateTime: int}, {...}, ...]
 */
async function balance(){
    let string = `recvWindow=${recv}&timestamp=${Date.now()}`;
    let signature = crypto.createHmac('sha256', secret_key).update(string).digest('hex');
    string = `${url2}balance?${string}&signature=${signature}`;
    const response = await fetch(`${string}`, {method: 'GET', headers: {'X-MBX-APIKEY' : api_key}});
    const data = await response.json();
    return data;
}


/**
 * Returns an array of objects contaning overall account information.
 *
 *  Particularly useful response object properties:
 * ---
 * ----
 * - assets[x].unrealizedProfit
 *
 * @returns {json} json
 ** - ex: [{too f*cking big to write out atm lmao}]
 */
async function account(){
    let string = `recvWindow=${recv}&timestamp=${Date.now()}`;
    let signature = crypto.createHmac('sha256', secret_key).update(string).digest('hex');
    string = `${url2}account?${string}&signature=${signature}`;
    const response = await fetch(`${string}`, {method: 'GET', headers: {'X-MBX-APIKEY' : api_key}});
    const data = await response.json();
    return data;
}


module.exports = {cropDepth, snipe, spread, book, price, trades, candles, order, orders, cancelOrder, risk, balance, account};