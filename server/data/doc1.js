const mongoose = require("mongoose");
const { Topic,Example } = require("../models/studymaterial");

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

const parseContent = (text) => {
  const contentBlocks = [];
  const examples = [];
  let currentPosition = 0;
  const textLength = text.length;

  while (currentPosition < textLength) {
    const matches = {
      code: text.slice(currentPosition).match(/## The Code start from\n([\s\S]*?)## The Code end/),
      text: text.slice(currentPosition).match(/\*! The text start\*([\s\S]*?)\*! The text end\*/),
      table: text.slice(currentPosition).match(/\|\| Table Start \|\|\n([\s\S]*?)\|\| Table End \|\|/),
      image: text.slice(currentPosition).match(/\[\[ Image Start \]\]\n([\s\S]*?)\[\[ Image End \]\]/),
      example: text.slice(currentPosition).match(/\{\{\s*Example code start\s*\}\}([\s\S]*?)\{\{\s*Example code end\s*\}\}/)
    };

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
          contentBlocks.push(headerMatch ? {
            contentType: 'text',
            textContent: `${headerMatch[1].trim()}:\n${headerMatch[2].trim()}`
          } : { contentType: 'text', textContent: content });
          break;
        }

        case 'table': {
          const rows = firstMatch[1].trim()
            .split('\n')
            .map(row => row.split('|').map(cell => cell.trim()).filter(Boolean));
          
          contentBlocks.push({
            contentType: 'table',
            tableContent: {
              headers: rows[0] || [],
              rows: rows.slice(1) || [],
              caption: ''
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
            imageContent: { url, altText: altText || '', caption: caption || '' }
          });
          break;
        }

        case 'example': {
          examples.push({
            code: firstMatch[1].trim(),
            description: "Code example"
          });
          break;
        }
        
      }
      currentPosition += firstMatch.index + firstMatch[0].length;
    } else {
      currentPosition++;
    }
  }
  console.log("Parsed Content:", JSON.stringify({ contentBlocks, examples }, null, 2)); // <-- Added log

  return { contentBlocks, examples };
};

const processContent = async (fullContent) => {
  const sectionRegex = /== Topic: (.*?) ==\s+=== Subtopic: (.*?) ===\s+([\s\S]*?)(?=\s*== Topic: |$)/g;
  let match;
  
  while ((match = sectionRegex.exec(fullContent)) !== null) {
    const [_, topicName, SubTopicName] = match;
    const sectionContent = match[3].trim();

    try {
      const { contentBlocks, examples } = parseContent(sectionContent);
      let topic = await Topic.findOne({ topicName, SubTopicName });
      const exampleIds = [];

      if (examples && examples.length > 0) {
        for (const example of examples) {
          const newExample = await Example.create({ topic: topic?._id, ...example });
          exampleIds.push(newExample._id);
        }
      }

      if (!topic) {
        topic = await Topic.create({
          topicName,
          SubTopicName,
          contentBlocks,
          examples: exampleIds
        });
      } else {
        topic = await Topic.findByIdAndUpdate(
          topic._id,
          {
            $push: {
              contentBlocks: { $each: contentBlocks },
              examples: { $each: exampleIds } // Corrected: Only push IDs, not objects
            },
            updatedAt: new Date()
          },
          { new: true }
        );
      }

      console.log(`✅ Processed: ${topicName} > ${SubTopicName}`);
    } catch (error) {
      console.error(`❌ Error processing ${topicName} > ${SubTopicName}:`, error);
    }
  }
};


async function example() {
  const sampleContent = 
`== Topic: JavaScript Basics ==
=== Subtopic: Functions ===

## The Code start from
function hello() {
  console.log("Hello World");
}
## The Code end

*! The text start*
*Function Definition:*
This is a simple function that prints Hello World
*! The text end*

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

{{Example code start }}
function example() {
  console.log("Example code block");
}
{{Example code end}}

== Topic: JavaScript Advanced ==
=== Subtopic: Closures ===

## The Code start from
function outer() {
  let count = 0;
  return function inner() {
    count++;
    console.log(count);
  };
}
## The Code end

*! The text start*
*Closures Explanation:*
A closure is a function that retains access to its lexical scope.
*! The text end`;

  try {
    await processContent(sampleContent);
    console.log("✅ All content processed successfully");
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