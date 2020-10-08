/*
Security middlewear:
    Use verifyForBackend on all places where a token needs to be checked. This will add the
    user onto req.user.
    If the token is illegitament, then it will throw a 401 error
*/

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {User} = require("../db/models");
const bearerToken = require("express-bearer-token");
const {secret, expiresIn} = require("../config").jwtConfig

const checkLoginDetails = async (req, res, next) =>{
    const {email, password, username} = req.body;
    let user;
    try{
        user = await User.findOne({where: {email}});
    } catch(e){
        if(!req.error){
            req.error = [];
        };
        req.error.push("Could not access database. Try again later");
        const err = new Error(e);
        err.status = 500;
        next(err)
    }
    let passResult = false;
    if(user){
        passResult = await bcrypt.compare(password, user.hashedPassword.toString())
    }
    if(!user || !passResult){
        if(!req.errors){
            req.errors = [];
        }
        req.errors.push("Email or Password is incorrect")
        const err = new Error("Email or Password is incorrect");
        err.status = 401;
        next(err);
        return;
    }
    const token = await generateNewToken(user.username);
    req.newToken = token;
    next();
    return;
};


const generateNewToken = async (username) =>{
    return await jwt.sign({username}, secret);
}

const verifyForBackend = async (req, res, next) =>{
    const token = req.token;
    if(!token){
        req.user = null;
        next();
        return;
    }
    jwt.verify(token, secret, null, async (err, payload) =>{
        if(err || !payload){
            req.user = null;
            next();
            return;
        }
        const {username} = payload;
        let user;
        try{
            user = await User.findOne({where: {username}});
        } catch(e){
            if(!req.error){
                req.error = [];
            };
            req.error.push("Could not access database. Try again later");
            const err = new Error(e);
            err.status = 500;
            next(err)
        }
        req.user = user;
        if(!user){
            if(!req.errors){
                req.errors = [];
            }
            req.errors.push("User not found")
            const err = new Error("User not found");
            err.status = 500;
            next(err)
            return;
        };
        next();
        return
    });

};

const verifyForFrontend = async (req, res, next) =>{
    console.log("starting middleware")
    if(!req.cookies){
        req.user = null;
        next();
        return
    };
    const token = req.cookies.loginToken
    console.log(req.cookies)
    console.log(token)
    jwt.verify(token, secret, null, async (err, payload) =>{
        console.log("veryifying")
        if(err || !payload){
            req.user = null;
            next();
            return
        }
        const {username} = payload;
        let user;
        try{
            user = await User.findOne({where: {username}});
        } catch(e){
            if(!req.error){
                req.error = [];
            };
            req.error.push("Could not access database. Try again later");
            const err = new Error(e);
            err.status = 500;
            next(err)
        }
        if(!user){
            if(!req.errors){
                req.errors = [];
            }
            req.errors.push("User not found")
            const err = new Error("User not found");
            err.status = 500;
            next(err)
            return;
        }
        req.user = user;
        next();
        return;
    })
    
}

const createCookie = async (username, res) => {
    const token = await generateNewToken(username)
    res.cookie("loginToken", token);
}


module.exports = {verifyForBackend, checkLoginDetails, generateNewToken, verifyForFrontend, createCookie}
