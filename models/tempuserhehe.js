
let sessionStore = {};


function setcurrentUser(req, user) {
    if (req && req.session) {
        req.session.user = user;
    }
}

function getcurrentUser(req) {
    if (req && req.session) {
        return req.session.user;
    }
    return null;
}

module.exports = {
    setcurrentUser,
    getcurrentUser
};