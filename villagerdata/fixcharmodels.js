// fixes charmodels in case of corrupted data, setting all numClaims to their real values
db.getCollection("charmodels").find().forEach(char => {
    const cardName = char.name;

    const ownerCount = db.getCollection("profilemodels").countDocuments({
        cards: { $elemMatch: { name: cardName } }
    });

    db.getCollection("charmodels").updateOne(
        { _id: char._id },
        { $set: { numClaims: ownerCount + 1 } }
    );
});