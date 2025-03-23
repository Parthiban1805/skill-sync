const mongoose = require("mongoose");
const { Topic } = require("../models/studymaterial");

const MONGODB_URI = "mongodb+srv://weacttech:Parthiban1805@cluster0.qf0if.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
}

const parseTopicInfo = (text) => {
  // Parse topic and subtopic information
  const topicMatch = text.match(/^== Topic: (.*?) ==/m);
  const subtopicMatch = text.match(/^=== Subtopic: (.*?) ===/m);

  if (!topicMatch || !subtopicMatch) {
    throw new Error("Topic or Subtopic information is missing");
  }

  return {
    topicName: topicMatch[1].trim(),
    SubTopicName: subtopicMatch[1].trim()  // Changed to match schema
  };
};

const parseContent = (text) => {
  const contentBlocks = [];
  let currentPosition = 0;
  const textLength = text.length;

  while (currentPosition < textLength) {
    // Try to match content blocks in order
    const matches = {
      code: text.slice(currentPosition).match(/## The Code start from\n([\s\S]*?)## The Code end/),
      text: text.slice(currentPosition).match(/\*\*! The text start\*\*([\s\S]*?)\*\*! The text end\*\*/),
      table: text.slice(currentPosition).match(/\|\| Table Start \|\|\n([\s\S]*?)\|\| Table End \|\|/),
      image: text.slice(currentPosition).match(/\[\[ Image Start \]\]\n([\s\S]*?)\[\[ Image End \]\]/)
    };

    // Find the first matching block
    let firstMatch = null;
    let matchType = null;
    let matchIndex = Infinity;

    for (const [type, match] of Object.entries(matches)) {
      if (match && match.index < matchIndex) {
        firstMatch = match;
        matchType = type;
        matchIndex = match.index;
      }
    }

    if (firstMatch) {
      switch (matchType) {
        case 'code':
          contentBlocks.push({
            contentType: 'code',
            textContent: firstMatch[1].trim()
          });
          break;

        case 'text': {
          const content = firstMatch[1].trim();
          const headerMatch = content.match(/\*\*([^*]+?)\*\*:([\s\S]*)/);
          
          if (headerMatch) {
            const [, header, description] = headerMatch;
            contentBlocks.push({
              contentType: 'text',
              textContent: `${header.trim()}:\n${description.trim()}`
            });
          } else {
            contentBlocks.push({
              contentType: 'text',
              textContent: content
            });
          }
          break;
        }

        case 'table': {
          const tableContent = firstMatch[1].trim();
          const rows = tableContent.split('\n').map(row => 
            row.split('|').map(cell => cell.trim()).filter(Boolean)
          );
          
          contentBlocks.push({
            contentType: 'table',
            tableContent: {
              headers: rows[0],
              rows: rows.slice(1),
              caption: 'Table'
            }
          });
          break;
        }

        case 'image': {
          const [url, altText, caption] = firstMatch[1]
            .trim()
            .split('\n')
            .map(line => line.trim());
          
          contentBlocks.push({
            contentType: 'image',
            imageContent: {
              url,
              altText,
              caption
            }
          });
          break;
        }
      }

      currentPosition += firstMatch.index + firstMatch[0].length;
    } else {
      currentPosition++;
    }
  }

  return contentBlocks;
};

const insertContentToTopic = async (content) => {
  try {
    // First parse the topic info
    const { topicName, SubTopicName } = parseTopicInfo(content);
    
    // Then parse the content blocks
    const contentBlocks = parseContent(content);

    // Find existing topic or create new one
    let topic = await Topic.findOne({ topicName, SubTopicName });
    
    if (!topic) {
      // Create new topic if it doesn't exist
      topic = await Topic.create({
        topicName,
        SubTopicName,  // Using correct schema field name
        contentBlocks: contentBlocks
      });
    } else {
      // Update existing topic
      topic = await Topic.findByIdAndUpdate(
        topic._id,
        { 
          $push: { contentBlocks: { $each: contentBlocks } },
          updatedAt: new Date()
        },
        { new: true }
      );
    }

    console.log('Content blocks created:', JSON.stringify(contentBlocks, null, 2));
    return topic;
  } catch (error) {
    console.error('Error inserting content:', error);
    throw error;
  }
};

async function example() {
  const sampleContent = `
== Topic: JavaScript Basics ==
=== Subtopic: Functions ===

## The Code start from
function hello() {
  console.log("Hello World");
}
## The Code end

**! The text start**
**Function Definition:**
This is a simple function that prints Hello World
**! The text end**

|| Table Start ||
Header1 | Header2 | Header3
Value1 | Value2 | Value3
Value4 | Value5 | Value6
|| Table End ||

[[ Image Start ]]
https://example.com/image.jpg
Example image
This is an example image
[[ Image End ]]
  `;

  try {
    await insertContentToTopic(sampleContent);
    console.log("✅ Content inserted successfully");
  } catch (error) {
    console.error("❌ Error in example:", error);
  } finally {
    mongoose.connection.close();
  }
}

(async () => {
  await connectDB();
  await example();
})();