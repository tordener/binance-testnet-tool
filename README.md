# binance-testnet-tool
Some pretty simple functions to do a bit of trading on Binance's testnet API with node

Pretty sure that you will need node version > 17 to use fetch or crypto
- A few of these functions are unfinished, check the doc block description when you are implementing them first
- To configure this, edit the .env file with your API key and secret

### .env file configuration
- `API_KEY` - your api key
- `SECRET_KEY` - your secret key
- `URL` - this tool MIGHT work on the actual binance livenet, haven't tested it yet. But if you want to try it, change these URLs to Binance's livenet
- `SYMBOL` - the symbol you want the bot to trade
- `TRADE_SIZE` - how much of the symbol to trade
- `RECVWINDOW` - how many miliseconds a request is valid for after being sent to binance's API
- `TTL` - how long an unfilled order stays in the orders list before being cancelled (only good if not using GTC)
- `TIME_IN_FORCE` - the type of order to place GTC is default
- `FEE` - set this variable to binance's fee so you can accurately calculate profits before making a trade 

## Function List


- `nancy.epochAt()` - helps with dealing with the time parameters for setting trades
- `nancy.snipe()` - doesn't work atm, but this helps you get into and out of a trade with the least spread
- `nancy.spread()` - gets the spread and volume for bids/asks, and the market price
- `nancy.cropDepth()` - trims down the spread for ease of reading or manipulating
- `nancy.book()` - gets the market depth
- `nancy.price()` - gets current market price for the symbol
- `nancy.trades()` - gets the recent trades for the symbol
- `nancy.order()` - places an order for the symbol at a specified price
- `nancy.orders()` - gets your open orders on the account
- `nancy.cancelOrder()` - cancels the chosen order
- `nancy.risk()` - gets all your positions
- `nancy.candles()` - gets candlestick data for a range of time
- `nancy.balance()` - gets the account balance
- `nancy.account()` - gets general account information

***
# Function Usage

## `nancy.epochAt()`
Makes it easier to go back or forward in unix-time by seconds, minutes, hours, or days
### Parameters
- `time_unit` - `'sec'`, `'min'`, `'hr'`, `'day'`
- `how_far` - integer value of the chosen time unit
- `tense` - integer - `-1` = past `1` = future

### Example to get the timestamp 20 seconds ago
```javascript
    epochAt('sec', 20, -1)
```

## `nancy.snipe()`

### Currently dysfunctional

* Snipe tries to get in or out of a trade as close to the market price as possible
* The user specifies the acceptable loss parameter (how great of a difference from market price), and it will search for entry/exit points that are within that value

### Parameters

- `direction` - boolean - the side of the originating order (true for buy, false for sell)
- `acceptable_loss` - float - acceptable difference from market price

### Example to exit a BUY position at most 5.93 units from market price
```javascript
    snipe(1, 5.93)
```

## `nancy.spread()`
Returns the JSON object containing spread data and market price
### Parameters
Takes no parameters

### Example to get the spread
```javascript
    spread()
```

# Example Program

(BEWARE) if you run this code it will start making some trades on your testnet account based on the market conditions

### Trade Logic

```
    1)
        a. get recent trades -> separate times/prices
        b. perform linear regression on trades data
    2)
        a. get market price
        b. create a "prediction" object ex:
            prediction = {
                'side' : 1,
                'price' : 75.15,
                'projection' : 75.81,
                'enter' : 1 // enter is the abs((price - projection) - fee)
            }
        c. check orders
            i. if no orders exist, check prediction.enter (if 1 - place order, if 0 - wait)
            ii. if orders exist, check prediction.side, and compare to order.side
                if they are the same, keep the order up.
                if they are different, (create a function that will close on a time schedule)
```
# Program Code

```javascript
require('dotenv').config(); 
const nancy = require('./nancy.js');
const quant = require('./quant.js');
let numbers = require('numbers');

setInterval(function(){
    let recent_trades;
    let lin_reg_mem;
    let now = Date.now();
    let in_1_min = now + 60000;
    let order = {};
    let trade_hist = [];
    nancy.trades()
    .then(
        data => {
            recent_trades = data;
        }   
    ).then(
        data => {
            let times = [];
            let prices = [];
            for(let a = 0; a < recent_trades.length; a++){
                times.push(recent_trades[a].time);
                prices.push(parseFloat(recent_trades[a].price));
            }
            let lin_reg = numbers.statistic.linearRegression(times, prices);
            lin_reg_mem = lin_reg;
        }
    ).then(
        data => {
            nancy.price().then(
                data => {
                    let current_price = data;
                    let pred = lin_reg_mem(in_1_min);
                    let order_format = {
                        'side' : null,
                        'prediction': null,
                        'price' : null,
                        'time' : null,
                        'fee' : null,
                        'size' : null,
                        'profit' : null,
                        'net' : null
                    }
                    if((pred - current_price) > 0){
                        order_format.side = 'BUY';
                        order_format.prediction = pred;
                        order_format.price = current_price;
                        order_format.time = now;
                        order_format.fee = (current_price) * process.env.FEE * 5;
                        order_format.size = 5;
                        order_format.profit = (Math.abs(pred - current_price)) * 5;
                        order_format.net = ((Math.abs(pred - current_price)) * 5) - ((current_price) * process.env.FEE * 5);
                        order = order_format;

                    }
                    else if((pred - current_price) < 0){
                        order_format.side = 'SELL';
                        order_format.prediction = pred;
                        order_format.price = current_price;
                        order_format.time = now;
                        order_format.fee = (current_price) * process.env.FEE * 5;
                        order_format.size = 5;
                        order_format.profit = (Math.abs(pred - current_price)) * 5;
                        order_format.net = ((Math.abs(pred - current_price)) * 5) - ((current_price) * process.env.FEE * 5);
                        order = order_format;

                    }
                    console.log(order);
                }
                ).then(
                    data => {
                        if(order.net >= 0.1){
                            console.log('********PLACE ORDER********');
                            trade_hist.push([order.price, order.time]);
                        }else{
                            console.log('********wait********');
                        }
                    }
                    ).then(
                        data => {
                            nancy.cropDepth(5).then(
                                data => {
                        }
                    )
                }
            )
        }
    );
} ,1000);
```

