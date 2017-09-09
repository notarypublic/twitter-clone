Meteor.methods({
  'tweets.insertTweet': function (tweet, isRetweet = false) {
    let tags = [];

    tweet.createdBy = Meteor.userId();
    tweet.createdOn = new Date();
    if (!isRetweet) {
      tweet.tweetData = sanitizeHtml(tweet.tweetData);
  
      let findTags = tweet.tweetData.split(' ');
      for (let word of findTags) {
        if (word.slice(0, 1) === '#') {
          tags.push(word.substring(1));
        }
      }
  
      tweet.tags = _.uniq(tags);
      tweet.tweetData = tweet.tweetData.replace(/#([a-zA-Z0-9]+)/g, '<a href="/search/?tags=$1">#$1</a>');
    
    }
    console.log(tweet);


    /*
        * Check if currentUser is inserting tweets to their own account
        * Parse message for @handles, #tags
        * createdOn, other fields?
    */
    let insertedTweet = Tweets.insert(tweet);
    Meteor.call('insertTags', insertedTweet);
    Meteor.users.update(
      { _id: Meteor.userId() },
      { $inc: { 'profile.tweetCount': 1 } }
    );

    return insertedTweet;
  },

  'tweets.deleteTweet': function (tweetId) {
    let tweet = Tweets.findOne({ _id: tweetId });
    if (tweet.createdBy === Meteor.userId()) {
      //todo: remove count from tags too
      // for (let tag of tweet.tags) {
      //   Meteor.call('removeTweetIdFromTag', tag, tweetId);
      // }

      Tweets.remove(tweetId);
      Meteor.users.update(
        { _id: Meteor.userId() },
        { $inc: { 'profile.tweetCount': -1 } }
      );
    }
  },

  'tweets.likeTweet': function (tweetId) {
    /*

    schema of a tweet will need an array of userIds that liked it
    a user's schema will need an array of tweets the user liked

    check if user already likes tweet
    */

    let tweet = Tweets.findOne({ _id: tweetId });
    let user = Meteor.users.findOne(Meteor.userId());


    if (tweet.likes.indexOf(Meteor.userId()) > -1) {
      //user is unliking this
      tweet.likes = _.without(tweet.likes, Meteor.userId());
      user.profile.likes = _.without(user.profile.likes, tweetId);
    } else {
      //user is liking this
      tweet.likes.push(Meteor.userId());
      user.profile.likes.push(tweetId);
    }

    Tweets.update(
      { _id: tweetId },
      { $set: { likes: tweet.likes } }
    );
    Meteor.users.update(
      { _id: Meteor.userId() },
      { $set: { 'profile.likes': user.profile.likes } }
    );

  },

  'tweets.retweetTweet': function (tweetId) {

    /*
      create a tweet with header saying who is retweeting this and content of original tweet
      update tweet schema to include retweeter, if any
      original tweet schema updated with id of new tweet (for counting purposes)

      more i'm sure


      ///////////////////
      if a retweet (or a quote):
      link to original tweet including original tweet's likes, author, etc as content
      OR
      copy original tweet into new tweet with additional properties, query metadata on tweet display (including replies)
    */

    let originalTweet = Tweets.findOne(tweetId);

    let newTweet = Meteor.call('tweets.insertTweet', {
      createdBy: originalTweet.createdBy,
      tweetData: originalTweet.tweetData,
      tags: originalTweet.tags,
      retweetedBy: Meteor.userId(),
      originalTweetId: tweetId
    }, true);

    originalTweet.retweets.push(newTweet);
    Tweets.update(
      { _id: tweetId },
      { $set: { retweets: originalTweet.retweets} }
    );

  }

});