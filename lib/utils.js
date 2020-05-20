const handlebars = require('handlebars');
const fs = require('fs');

exports.generateOrderId = () => {
    let result1 = '', result2 = '';
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', numbers = '0123456789';
    for ( let i = 0; i < 3; i++ ) {
       result1 += chars.charAt(Math.floor(Math.random() * 26));
       result2 += numbers.charAt(Math.floor(Math.random() * 10));
    }
    return result1 + result2;
 }

exports.getTodayDate = (offset = 0) => {
    const today = new Date()
    today.setDate(today.getDate() + offset)
    let dd = today.getDate()
    if(dd<10)   dd = '0' + dd
    let mm = today.getMonth()+1
    if(mm<10)   mm = '0' + mm
    return `${today.getFullYear()}-${mm}-${dd}`
}

exports.getTimeAheadOrBefore = seconds => Date.now() + (seconds*1000)

exports.capitalize = str => {
    str = str.toLowerCase().split(' ').map(word => word.replace(word[0], word[0].toUpperCase()))
    return str.join(' ')
}

exports.serverErrorMsg = error => ({
    error: error.code ? error.code : JSON.stringify(error),
    status: 'FAIL',
    message: error.message ? error.message : 'Internal Server Error'
})

exports.customTemplate = (type, payload) => {
    let path = ''
    switch (type) {
        case 'customer':
            path = './views/order-conf.html'
            break;
        case 'store':
            path = './views/order-conf-store.html'
            break;
        case 'admin':
            path = './views/order-conf-admin.html'
            break;
        default:
            throw new Error('INVALID_PATH')
            break;
    }
    const content = fs.readFileSync(path).toString();
    const template = handlebars.compile(content);
    return template(payload)
}