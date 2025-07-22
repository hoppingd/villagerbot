db.getCollection("charmodels").find().forEach(char => {
    const cardName = char.name;

    // Count profiles where any card in the array has name equal to cardName
    const ownerCount = db.getCollection("profilemodels").countDocuments({
        cards: { $elemMatch: { name: cardName } }
    });

    // Update numClaims in charmodels
    db.getCollection("charmodels").updateOne(
        { _id: char._id },
        { $set: { numClaims: ownerCount + 1 } }
    );
});