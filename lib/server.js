/*jslint node:true*/
'use strict';

var fs = require('fs');
var path = require('path');
var util = require('util');

var assert = require('assert-plus');
var bunyan = require('bunyan');
var restify = require('restify');



///--- Errors

function MissingNameError() {
	restify.RestError.call(this, {
		statusCode: 409,
		restCode: 'MissingName',
		message: '"name" is a required parameter',
		constructorOpt: MissingNameError
	});

	this.name = 'MissingNameError';
}
util.inherits(MissingNameError, restify.RestError);


function AccountExistsError(name) {
	assert.string(name, 'name');

	restify.RestError.call(this, {
		statusCode: 409,
		restCode: 'AccountExists',
		message: name + ' already exists',
		constructorOpt: AccountExistsError
	});

	this.name = 'AccountExistsError';
}
util.inherits(AccountExistsError, restify.RestError);


function AccountNotFoundError(name) {
	assert.string(name, 'name');

	restify.RestError.call(this, {
		statusCode: 404,
		restCode: 'AccountNotFound',
		message: name + ' was not found',
		constructorOpt: AccountNotFoundError
	});

	this.name = 'AccountNotFoundError';
}
util.inherits(AccountNotFoundError, restify.RestError);



///--- Handlers

/**
 * Creates a new account.
 *
 *  Account JSON:
 *
 *  id: Id of the account
 *  name (string): account name
 *  emailAddress (string): email address
 *  outgoingServer (struct): SMTP server description
 *      serverName (string): address of the server
 *      serverPort (number): port number (optional). Default: 25 (none) 465 (ssl/tls)
 *      username (string): username used for authentication
 *      password (string): the password for the account.
 *      connectionSecurity (string): none, SSL/TLS, STARTTLS
 *      authenticationMethod (string): none, normal, encrypted, kerberos, NTLM
 *  incomingServer (struct):
 *      type (string): imap, pop
 *      serverName (string): address of the server
 *      serverPort (number): port number (optional). Default: 143/993 (imap) or 110/995 (pop)
 *      username (string): username used for authentication
 *      password (string): the password for the account.
 *      connectionSecurity (string): none, SSL/TLS, STARTTLS
 *      authenticationMethod (string): none, normal, encrypted, kerberos, NTLM, TLS certificate
 *      checkTimeout (number): check for new messages every X seconds
 *      leaveMessage (boolean): Leave messages on server until I delete them
 */
function createAccount(req, res, next) {
	if (!req.params.name) {
		req.log.warn({
			params: req.params
		}, 'createAccount: missing name');
		next(new MissingNameError());
		return;
	}

	var account = {
		name: req.params.name,
		emailAddress: req.params.emailAddress
	};

	if (req.accounts.indexOf(account.name) !== -1) {
		req.log.warn('%s already exists', account.name);
		next(new AccountExistsError(account.name));
		return;
	}

/*
	var p = path.normalize(req.dir + '/' + account.name);
	fs.writeFile(p, JSON.stringify(account), function (err) {
		if (err) {
			req.log.warn(err, 'createAccount: unable to save');
			next(err);
		} else {
			req.log.debug({
				account: account
			}, 'createAccount: done');
			res.send(201, account);
			next();
		}
	});
*/
	res.send(201, account);
	next();
}


/**
 * Deletes a Account by name
 */
function deleteAccount(req, res, next) {
	fs.unlink(req.account, function (err) {
		if (err) {
			req.log.warn(err,
				'deleteAccount: unable to unlink %s',
				req.account);
			next(err);
		} else {
			res.send(204);
			next();
		}
	});
}


/**
 * Deletes all Accounts (in parallel)
 */
function deleteAllAccounts(req, res, next) {
	var done = 0;

	// Note this is safe, as restify ensures "next" is called
	// only once
	function cb(err) {
		if (err) {
			req.log.warn(err, 'unable to delete a Account');
			next(err);
		} else {
			done += 1;
			if (done === req.accounts.length) {
				next();
			}
		}
	}

	if (req.accounts.length === 0) {
		next();
		return;
	}

	req.accounts.forEach(function (t) {
		var p = req.dir + '/' + t;
		fs.unlink(p, cb);
	});
}

/**
 * Simply checks that a account on /accounts/:id was loaded.
 * Requires loadAccounts to have run.
 */
function ensureAccount(req, res, next) {
	assert.arrayOfString(req.accounts, 'req.accounts');

	if (req.params.id && req.accounts.indexOf(req.params.id) === -1) {
		req.log.warn('%s not found', req.params.id);
		next(new AccountNotFoundError(req.params.id));
	} else {
		next();
	}
}


/**
 * Loads a Account by id
 *
 * Requires `loadAccounts` to have run.
 *
 * Note this function uses streaming, as that seems to come up a lot
 * on the mailing list and issue board.  restify lets you use the HTTP
 * objects as they are in "raw" node.
 *
 * Note by using the "raw" node APIs, you'll need to handle content
 * negotiation yourself.
 *
 */
function getAccount(req, res, next) {
	if (req.accepts('json')) {
		var fstream = fs.createReadStream(req.account);

		fstream.once('open', function onOpen() {
			res.setHeader('Content-Type', 'application/json');
			res.writeHead(200);
			fstream.pipe(res);
			fstream.once('end', next);
		});

		// Really, you'd want to disambiguate the error code
		// from 'err' here to return 403, 404, etc., but this
		// is just a demo, so you get a 500
		fstream.once('error', next);
		return;
	}

	fs.readFile(req.account, 'utf8', function (err, data) {
		if (err) {
			req.log.warn(err, 'get: unable to read %s', req.account);
			next(err);
			return;
		}

		res.send(200, JSON.parse(data));
		next();
	});
}



/**
 * Loads up all the stored Accounts from our "database". Most of the downstream
 * handlers look for these and do some amount of enforcement on what's there.
 */
function loadAccounts(req, res, next) {
	fs.readdir(req.dir, function (err, files) {
		if (err) {
			req.log.warn(err,
				'loadAccount: unable to read %s',
				req.dir);
			next(err);
		} else {
			req.accounts = files;

			if (req.params.id) {
				req.account = req.dir + '/' + req.params.id;
			}

			req.log.debug({
				account: req.account,
				accounts: req.accounts
			}, 'loadAccounts: done');

			next();
		}
	});
}


/**
 * Simple returns the list of Accounts that were loaded.
 * This requires loadAccount to have run already.
 */
function listAccounts(req, res, next) {
	assert.arrayOfString(req.accounts, 'req.accounts');

	res.send(200, req.accounts);
	next();
}


/**
 * Replaces a Accounts completely
 */
function putAccount(req, res, next) {
	if (!req.params.task) {
		req.log.warn({
			params: req.params
		}, 'putAccount: missing task');
		next(new MissingNameError());
		return;
	}

	// Force the name to be what we sent this to
	var account = {
		name: req.params.name,
		task: req.params.task
	};

	fs.writeFile(req.account, JSON.stringify(req.body), function (err) {
		if (err) {
			req.log.warn(err, 'putAccount: unable to save');
			next(err);
		} else {
			req.log.debug({
				account: req.body
			}, 'putAccount: done');
			res.send(204);
			next();
		}
	});
}


///--- API

/**
 * Returns a server with all routes defined on it
 */
function createServer(options) {
	assert.object(options, 'options');
	assert.string(options.directory, 'options.directory');
	assert.object(options.log, 'options.log');

	// Create a server with our logger
	// Note that 'version' means all routes will default to
	// 1.0.0
	var server = restify.createServer({
		log: options.log,
		name: 'ESI',
		version: '1.0.0'
	});

	// Ensure we don't drop data on uploads
	server.pre(restify.pre.pause());

	// Clean up sloppy paths like //account//////1//
	server.pre(restify.pre.sanitizePath());

	// Handles annoying user agents (curl)
	server.pre(restify.pre.userAgentConnection());

	// Set a per request bunyan logger (with requestid filled in)
	server.use(restify.requestLogger());

	// Allow 5 requests/second by IP, and burst to 10
	server.use(restify.throttle({
		burst: 10,
		rate: 5,
		ip: true
	}));

	server.use(restify.acceptParser(server.acceptable));
	server.use(restify.dateParser());
	server.use(restify.authorizationParser());
	server.use(restify.queryParser());
	server.use(restify.gzipResponse());
	server.use(restify.bodyParser());

	/// Accounts handlers.

	server.use(loadAccounts);

	server.post('/accounts', createAccount);
	server.get('/accounts', listAccounts);
	server.head('/accounts', listAccounts);


	// everything else requires that the Account exist
	server.use(ensureAccount);

	// Return a Account by id

	server.get('/accounts/:id', getAccount);
	server.head('/accounts/:id', getAccount);

	// Overwrite a complete Account - here we require that the body
	// be JSON - otherwise the caller will get a 415 if they try
	// to send a different type
	// With the body parser, req.body will be the fully JSON
	// parsed document, so we just need to serialize and save
	server.put({
		path: '/accounts/:id',
		contentType: 'application/json'
	}, putAccount);

	// Delete a Account by id
	server.del('/accounts/:id', deleteAccount);

	// Destroy everything
	server.del('/accounts', deleteAllAccounts, function respond(req, res, next) {
		res.send(204);
		next();
	});


	// Register a default '/' handler

	server.get('/', function root(req, res, next) {
		var routes = [
			'GET     /',
			'POST    /accounts',
			'GET     /accounts',
			'DELETE  /accounts',
			'PUT     /accounts/:id',
			'GET     /accounts/:id',
			'DELETE  /accounts/:id'
		];
		res.send(200, routes);
		next();
	});

	// Setup an audit logger
	if (!options.noAudit) {
		server.on('after', restify.auditLogger({
			body: true,
			log: bunyan.createLogger({
				level: 'info',
				name: 'esiapp-audit',
				stream: process.stdout
			})
		}));
	}

	return (server);
}



///--- Exports

module.exports = {
	createServer: createServer
};