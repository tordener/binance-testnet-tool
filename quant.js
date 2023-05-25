/**
 * Calculates the least squares of a dataset and returns the slope coefficient, y-intercept, and MSE as an array
 * - handy reminder on usage (y = mx+b) : (y = returned[0] * (x value) + returned[1])
 * ---
 * @param {array} data (int/float) 2D array containing x values at index 0, y values at index 1 
 * @returns {array} returns an array with the y-intercept at index 0 and slope coefficient at index 1 , MSE at index 2
 */
function leastSquares(data){
    let [x, y, xy, x_s, n, m, b, MSE] = [0,0,0,0,0,0,0,0];
    for(let a = 0, l = data.length; a < l; a++){
        x += data[a][1];
        y += data[a][0];
        xy += (data[a][1]) * (data[a][0]);
        x_s += (data[a][0]) * (data[a][1]);
    }
    n = data.length;
    m = ((n * xy) - (x * y)) / ((n * x_s) - (x * x));
    b = (y - (m * x)) / n;
    for(let c = 0; c < n; c++){                                                                                     
        MSE += ((m * data[c][1] + b) - (data[c][0])) * ((m * data[c][1] + b) - (data[c][0]));
    }
    return [m, b, MSE / n];
}


/**
 * Returns the standard deviation of a data set
 * @param {array} data 1D array containing the data set
 * @returns {float} float value of the standard deviation
 */
function sDev(data){
    let n = data.length;
    let [x_, ns, S] = [0,0,0];
    for(let a = 0; a < n; a++){
        x_ += data[a];
    }
    x_ = x_ / n;
    for(let b = 0; b < n; b++){
        ns += (data[b] - x_) * (data[b] - x_);
    }
    return Math.sqrt(ns / n);
}


/**
 * Helps you go back in unix-time by seconds, minutes, hours, or days
 * @param {string} time_unit takes values: 'sec', 'min', 'hr', 'day'
 * @param {int} how_far how much of the desired time unit to go back in time
 * @param {int} tense determines future time or past time (1 = future: -1 = past)
 * @returns {int} integer value of the resulting unix-time
 */
 function epochAt(time_unit, how_far, tense){
    let current_time = Math.floor(Date.now());
    let resulting_time;
    let M = 1000;
    let second = 1 * M;
    let minute = 60 * M;
    let hour = 3600 * M;
    let day = 86400 * M;

    switch(time_unit){
        case 'sec':
            resulting_time = current_time + tense * (second * how_far);
            break;
        case 'min':
            resulting_time = current_time + tense * (minute * how_far);
            console.log(resulting_time);
            break;
        case 'hr':
            resulting_time = current_time + tense * (hour * how_far);
            break;
        case 'day':
            resulting_time = parseInt(current_time) + tense * (day * how_far);
            break;
    }
    return resulting_time;
}

module.exports = {leastSquares, sDev,epochAt};