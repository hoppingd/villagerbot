db.getCollection("charmodels").find().forEach(char => {
    const cardName = char.name;

    const ownerCount = db.getCollection("profilemodels").countDocuments({
        $or: [
            { cards: { $elemMatch: { name: cardName } } },
            { storage: { $elemMatch: { name: cardName } } }
        ]
    });

    db.getCollection("charmodels").updateOne(
        { _id: char._id },
        { $set: { numClaims: ownerCount + 1 } }
    );
});