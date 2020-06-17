import express from 'express';
import BodyParser from 'body-parser';
import { entries } from '../dbHandler';
import jwt from 'express-jwt';
import cors from 'cors';
import fs from 'fs';

const router = express.Router();

router.use(cors());
function testParams(body: any) {
   if(body.links !== undefined && !Array.isArray(body.links)) {
    throw 'links is not an array';
  }
  if(body.socialLinks !== undefined && typeof(body.socialLinks) !== 'object') {
    throw 'socialLinks is not an object';
  }
  if(body.friendlyName !== undefined && typeof(body.friendlyName) !== 'string') {
    throw 'friendlyName is not a string';
  }
}

const key = fs.readFileSync('key.rs');
router.use(BodyParser.json());
router.put('/:name',
  jwt({
    secret: key
  }),
  (request, response) => {
    console.log("New entry: %s", request.params.name);

    if(request.body.links == undefined) {
      request.body.links = [];
    }
    if(request.body.socialLinks == undefined) {
      request.body.socialLinks = {};
    }
    if(request.body.friendlyName == undefined) {
      request.body.friendlyName = request.params.name
    }
    try
    {
      testParams(request.body);
    }
    catch (error)
    {
      response.status(400);
      response.send({ error });
      return;
    }

    entries.updateOne(
      {
        name: request.params.name.toLowerCase(),
      },
      {
        $set: {
          links: request.body.links,
          socialLinks: request.body.socialLinks,
          friendlyName: request.body.friendlyName,
        },
      },
      { upsert: true });

    // Always send valid JSON!
    response.send({});
  });

router.patch('/:name',
  jwt({
    secret: key
  }),
  (request, response) => {
  try
  {
    testParams(request.body);
  }
  catch (error)
  {
    response.status(400);
    response.send({ error });
    return;
  }
  let changeSet : any = {};
  if(request.body.links !== undefined) {
    changeSet.links = request.body.links;
  }
  if(request.body.socialLinks !== undefined) {
    changeSet.socialLink = request.body.socialLinks;
  }
  if(request.body.friendlyName !== undefined) {
    changeSet.friendlyName = request.body.friendlyName;
  }
  if(Object.keys(changeSet).length === 0) {
    response.status(400);
    response.send({
      error: "PATCH needs a parameter",
    });
    return;
  };
  entries.updateOne(
    {
      name: request.params.name.toLowerCase()
    },
    {
      $set: changeSet,
    }
  ).then((result) => {
    if(result.modifiedCount === 0)
    {
      // Nothing was found
      response.status(404);
      response.send(
        {
          error: "Entry not found",
        });
    }
    else
    {
      response.send({});
    }
  })
  .catch(console.error);
});

router.get('/:name', async (request, response) => {
  const entry = await entries.findOne({ name: request.params.name.toLowerCase() });
  if(entry === null) {
    response.status(404);
    response.send({
      error: 'Entry does not exist'
    });
    return;
  }
  entry._id = undefined;
  response.send(entry);
});
export default router;
