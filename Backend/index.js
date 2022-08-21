require("dotenv").config();
var express = require("express");
var app = express();
const cookieParser = require("cookie-parser");
const sessions = require('express-session');
var multer = require("multer");
var bodyParser = require("body-parser" );
var path = require("path");
var alerting = require("alert");
var mysql = require("mysql");
var nodemailer = require("nodemailer");
var bcrypt = require("bcrypt");
const { table } = require("console");
var upload = multer();
var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: process.env.DB_PASSWORD,
    database: "dbms"
})
var transporter = nodemailer.createTransport({
    service: "gmail",
    host: 'smtp.gmail.com',
    auth: {
        user: process.env.USEREMAIL,
        pass: process.env.APP_PASSWORD
    }
})

var userdetails = [0,0,0,0];
var n = [0,0,0,0];
var l = [0,0];
var values = [0];
var newpassword;
var emailidforchangingpwd;
var toemailid;
var timeup  = "no";
var forgotpwdotp
var saltrounds = 10;
var hashed;
var fieldlist = [];
var datalist = [];
var tablename ;



app.set("view engine","ejs");
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(upload.array());
var oneDay = 1000 * 60 * 60 * 24;
var session;
app.use(sessions({
    secret: process.env.SESSION_PASS,
    saveUninitialized:true,
    cookie: { maxAge: oneDay },
    resave: false
}));
app.use(cookieParser());
app.get("/login",function(req,res){
    res.render("loginpage");

})
app.post("/login",function(req,res){
    l[0] = req.body.name;
    l[1] = req.body.password;
    session=req.session;
    con.query("select * from logindetails where username = ?",[l[0]],function(err,result){
        let passres;
        if(result.length!=0){
        session.name = result[0].username;
        session.phone = result[0].phoneno;
        session.email = result[0].email;
        return new Promise(function(resolve,reject){
            bcrypt.compare(req.body.password,result[0].password,function(err,res){
                passres = res;
                resolve(passres)
                
            })
        }).then(function(){
            console.log(passres);
        if(passres){
            return res.redirect("/welcome");
        }
        else{
            alerting("password is incorrect");
            return res.redirect("/login");
        }

        })
        
        
        
        
    }
    else{
        alerting("You haven't registered yet");
        return res.redirect("/login");
    }
    })
    
})

app.get("/otpforgotpwd",function(req,res){
    timeup = "no";
    res.render("otpverification");
    forgotpwdotp = Math.floor(Math.random()*899999)+100000;
    var mailoption = {
        from: process.env.USEREMAIL,
        to: toemailid,
        subject: "setting new password",
        text: "Your otp for logging into the digital slambook is : "+forgotpwdotp
    }
    transporter.sendMail(mailoption,function(err,info){
        if(err){
            return console.log(err);
        }
        else{
            console.log("message sent");
            console.log(info);
        }
    })
    
    setTimeout(function(){
        timeup = "yes";
    },120000)
    
})
app.post("/otpforgotpwd", function(req,res){
    if(forgotpwdotp == req.body.otpforregistration && timeup == "no"){
        con.query("update logindetails set password = ? where email= ? ",[newpassword,emailidforchangingpwd],function(err,result){
            
            if(err){
                return console.log(err);
            }
        })
        alerting("password changed successfully");
        res.redirect("/login");
    }
    else if(timeup == "yes" ){
        timeup = "no";
        alerting("Time's up")
    }
    else{
        alerting("OTP is wrong");
        res.redirect("/login");
    }
    timeup = "no";
    
})
app.get("/forgotpwd",function(req,res){
    res.render("forgotpwd");
})
app.post("/forgotpwd", function(req,res){
    session=req.session;
    bcrypt.genSalt(saltrounds,function(err,salt){
        bcrypt.hash(req.body.password,salt,function(err,hash){
            newpassword = hash;
        })
    })
    newpassword = req.body.password;
    toemailid = req.body.emailid;
    emailidforchangingpwd = req.body.emailid;
    con.query("select * from logindetails where email = ?",[toemailid],function(err,result){
        if(result.length==0){
            alerting("wrong username");
            return res.redirect("/forgotpwd")
        }
        else{
            session.name = result[0].username;
            session.phone = result[0].phoneno;
            session.email = result[0].email;
    return  res.redirect("/otpforgotpwd");}
        
    })
   
})
app.get("/registration", function(req,res){
    res.render("registration");
})
app.post("/registration",function(req,res) {
    session = req.session
    n[0] = req.body.name;
    n[1] = req.body.phoneno;
    n[2] = req.body.emailid;
    session.name = n[0];
    session.phone = n[1];
    session.email = n[2];
    values[0] = n;
    return new Promise(function(resolve,reject){
        bcrypt.genSalt(saltrounds, function(err, salt) {
            bcrypt.hash(req.body.password, salt, function(err, hash) {
                if(err){
                    return console.log(err);
                }
                hashed = hash;
                console.log(hashed);
                resolve(hashed)
                
            });
        });

    }).then(function(){
        con.query("select * from logindetails where username = '"+n[0]+"' || email = '"+n[2]+"';",function(err,result){
            if(err){
                return console.log(err);
            }
            if(result.length==0){
                console.log(hashed);
                con.query("insert into logindetails values ('"+n[0]+"','"+n[2]+"',"+n[1]+",'"+hashed+"');", function(err,result){
                    alerting(" Details added ");
                    return res.redirect("/welcome");
                })
            }
            else{
                alerting("username or emailid already exists");
                return res.redirect("/registration");
            }
        })

    })
})
app.get("/welcome",function(req,res){
    session = req.session;
    res.render("welcome",{name:session.name})
})
app.post("/welcome",function(req,res){
    session = req.session;
    session.destroy(function(err){
        if(err){
            return console.log(err)
        }
    })
    res.redirect("/login");
})
app.get("/create",function(req,res){
    res.render("create")
})
app.post("/create",function(req,res){
    let query = " ";
    tablename = req.body.tablename;
    return new Promise(function(resolve,reject){
        con.query("show tables",function(err,result){
            for(let i = 0; i<result.length; i++){
                if(result[i].Tables_in_dbms == tablename){
                    alerting("table already exists");
                    return res.redirect("/create");
                }
            }
            resolve("ok")
        })
    }).then(function(){
        if(req.body.field.length == req.body.datatype.length && typeof req.body.field=="object"){
            return new Promise(function(resolve){
                for(let i = 0; i<req.body.field.length; i++){
                    query+= req.body.field[i] + " ";
                    query+= req.body.datatype[i] + " ";
                    if(i!=req.body.field.length-1){
                        query+=",";
                    }
                }
                resolve("ok")
            }).then(function(){
                con.query("create table "+tablename+" ("+query+");",function(err,result){
                    if(err){
                        return alerting("invalid values entered")
                    }
                    alerting("Created table");
                    res.redirect("/welcome")
                })
            })
            
            
            
        }
        else{
            if(req.body.field!="object"){
                con.query("create table "+tablename+"("+req.body.field+" "+req.body.datatype+");",function(err,result){
                    if(err){
                        return alerting("invalid entries")
                    }
                    alerting("created");
                    return res.redirect("/welcome")
                })
            }
            else{
            alerting("fields dont match with datatypes")
            return res.redirect("/create")}
        }
        

    })
})

app.get("/insert",function(req,res){
    res.render("insert")
})
app.post("/insert",function(req,res){
    let flag = 0;

    let query1 = " ";
    let query2 = " "
    tablename = req.body.tablename;
    return new Promise(function(resolve,reject){
        con.query("desc "+tablename,function(err,result){
            if(err){
                alerting("tables doesnt exist");
                return res.redirect("/welcome")
            }
            if(typeof req.body.field == "object"){
            
            for(let i = 0; i<req.body.field.length; i++){
                for(let j = 0; j<result.length; j++){
                    if(result[j].Field == req.body.field[i] && !result[j].Type.includes("int")){
                        query2+= "'"+req.body.value[i]+"'";
                        flag = 1;
                        break

                    }
                }
                query1+= req.body.field[i];
                if(flag!=1){
                    query2+= req.body.value[i];
                }
                flag = 0
                console.log(query1 )
                console.log(query2 )

                if(i!=req.body.field.length-1){
                    query1+=","
                    query2+=","
                }
                console.log(query1 )
                console.log(query2 )
    
            }
            resolve("ok")}
            else{
                let flag = 0
                for(let j = 0; j<result.length; j++){
                    if(result[j].Field == req.body.field && !result[j].Type.includes("int")){
                        query2+= "'"+req.body.value+"'";
                        flag = 1;
                        break

                    }
                }
                if(flag==0){
                    query2 = req.body.value
                }
                query1 = req.body.field;
                resolve("of")
                
            }

        })
        
        


    }).then(function(){

        con.query("select * from "+tablename+";",function(err,result){
            if(err){
                 alerting("table doesnt exist")
                 return res.redirect("/welcome")
            }
        })
        con.query("insert into "+tablename+"("+query1+") values("+query2+");",function(err){
            if(err){
                alerting("invalid details entered")
                return res.redirect("/insert");
            }
            query1 = " ";
    query2 = " "
            alerting("added values");
            return res.redirect("/welcome");
        } )
    })
})

app.get("/update",function(req,res){
    res.render("update");
})
app.post("/update",function(req,res){
    
    let tablename = req.body.tablename
    let query1= " ";
    let query2 = " ";
    let query3;
    return new Promise(function(resolve){
        con.query("desc "+tablename,function(err,result){
            if(err){
                alerting("table doesnt exist");
                return res.redirect("/welcome")
            }
            let flag = 0;
            for(let j = 0; j<result.length; j++){
                if(result[j].Field == req.body.field && !result[j].Type.includes("int")){
                    query1+= "'"+req.body.value+"'";
                    flag = 1;
                    break

                }
            }
            if(flag==0){
                query1 = req.body.value;
            }
            flag = 0; 
            if(typeof req.body.constraint == "object"){
                for(let i = 0; i<req.body.constraint.length; i++){
                    for(let j = 0; j<result.length; j++){
                        if(result[j].Field == req.body.constraint[i] && !result[j].Type.includes("int")){
                            query2+= req.body.constraint[i]+"='"+req.body.cval[i]+"'";
                            flag = 1;
                            break
    
                        }
                    }
                    if(flag!=1){
                        query2+= req.body.constraint[i]+"="+req.body.cval[i];
                    }
                    flag = 0
                    console.log(query2 )
    
                    if(i!=req.body.constraint.length-1){
                        query2+="&&"
                    }
                    console.log(query1 )
                    console.log(query2 )
                    

            }
        resolve("od")}
            else{
                let flag = 0
                for(let j = 0; j<result.length; j++){
                    if(result[j].Field == req.body.constraint && !result[j].Type.includes("int")){
                        query2+= req.body.constraint+"='"+req.body.cval+"'";
                        flag = 1;
                        break

                    }
                }
                if(flag==0){
                    query2 = req.body.constraint+"="+req.body.cval;
                }
                resolve("of")

            }
        })
    }).then(function(){
        if(req.body.constraint!=""){
        con.query("update "+tablename+" set "+req.body.field+"="+query1+" where "+query2,function(err){
            if(err){
                alerting("invalid details entered")
                return res.redirect("/insert");
            }
            query1 = " ";
    query2 = " "
            alerting("updated");
            return res.redirect("/welcome");
        } )}
        else{
            con.query("update "+tablename+" set "+req.body.field+"="+query1,function(err){
                if(err){
                    alerting("invalid details entered")
                    return res.redirect("/insert");
                }
                query1 = " ";
        query2 = " "
                alerting("updated");
                return res.redirect("/welcome");
            } )

        }

    })

})

app.get("/delete",function(req,res){
    res.render("delete");
})
app.post("/delete",function(req,res){
    let tablename = req.body.tablename
    let query2 = " ";
    return new Promise(function(resolve){
        con.query("desc "+tablename,function(err,result){
            if(err){
                alerting("table doesnt exist");
                return res.redirect("/welcome")
            }
            let flag = 0;
            if(typeof req.body.constraint == "object"){
                for(let i = 0; i<req.body.constraint.length; i++){
                    for(let j = 0; j<result.length; j++){
                        if(result[j].Field == req.body.constraint[i] && !result[j].Type.includes("int")){
                            query2+= req.body.constraint[i]+"='"+req.body.cval[i]+"'";
                            flag = 1;
                            break
    
                        }
                    }
                    if(flag!=1){
                        query2+= req.body.constraint[i]+"="+req.body.cval[i];
                    }
                    flag = 0
                    console.log(query2 )
    
                    if(i!=req.body.constraint.length-1){
                        query2+="&&"
                    }
                    console.log(query1 )
                    console.log(query2 )
                    

            }
        resolve("od")}
            else{
                let flag = 0
                for(let j = 0; j<result.length; j++){
                    if(result[j].Field == req.body.constraint && !result[j].Type.includes("int")){
                        query2+= req.body.constraint+"='"+req.body.cval+"'";
                        flag = 1;
                        break

                    }
                }
                if(flag==0){
                    query2 = req.body.constraint+"="+req.body.cval;
                }
                resolve("of")

            }
        })
    }).then(function(){
        if(req.body.constraint!=""){
        con.query("delete from  "+tablename+" where "+query2,function(err){
            if(err){
                alerting("invalid details entered")
                return res.redirect("/insert");
            }
            query1 = " ";
    query2 = " "
            alerting("updated");
            return res.redirect("/welcome");
        } )}
        else{
            con.query("delete from  "+tablename,function(err){
                if(err){
                    console.log(err)
                    return res.redirect("/insert");
                }
                query1 = " ";
        query2 = " "
                alerting("updated");
                return res.redirect("/welcome");
            } )
        }

    })

})







app.listen(1270,function(err){
    if(err){
        return console.log(err)
    }
    console.log("server is running")
})