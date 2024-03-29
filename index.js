const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();
const { MongoClient, ServerApiVersion, Collection, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        console.log('decoded', decoded);
        req.decoded = decoded;
        next();
    })

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hkb9l.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect()
        const productCollection = client.db('electroDepot').collection('product');

        // AUTH
        app.post('/login', async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {
                expiresIn: '1d'
            });
            res.send({ accessToken });

        })

        // SERVICES API
        app.get('/product', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        });

        app.post('/product', async (req, res) => {
            const newItem = req.body;
            const result = await productCollection.insertOne(newItem);
            res.send(result);
        });

        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
        });

        app.put('/product/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updatedQuantity = req.body;
            if (updatedQuantity?.AddedQuantity) {
                const options = { upsert: true };
                const updateDoc = {
                    $set: {
                        quantity: updatedQuantity.AddedQuantity
                    }
                };
                const result = await productCollection.updateOne(filter, updateDoc, options);
                res.send(result);
            }

            else {
                const product = await productCollection.findOne(filter);
                let quantity = product.quantity - 1;
                const result = await productCollection.updateOne(filter, { $set: { quantity: quantity } })
                res.send(result);
            }

        });

        app.get('/myItems', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const cursor = productCollection.find(query);
                const products = await cursor.toArray();
                res.send(products);
            }
            else {
                res.status(403).send({ message: 'Forbidden access' })
            }
        });


    }
    finally {

    }
};

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('server is running')
});

app.listen(port, "0.0.0.0", () => {
    console.log('listening server ports');
})