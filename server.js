const express=require('express');
const cors=require('cors');
const RssParser=require('rss-parser');
const fs=require('fs');
const path=require('path');
const cron=require('node-cron');

const app=express();
const PORT=process.env.PORT||3000;
const DATA_FILE=path.join(__dirname,'news-data.json');
const FEEDS_FILE=path.join(__dirname,'feeds.json');

app.use(cors());
app.use(express.static(path.join(__dirname,'public')));

var parser=new RssParser({timeout:15000,headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}});

function loadFeeds(){try{return JSON.parse(fs.readFileSync(FEEDS_FILE,'utf8'))}catch(e){return{categories:[]}}}
function loadNews(){try{return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'))}catch(e){return{updated:'',items:[]}}}
function saveNews(data){fs.writeFileSync(DATA_FILE,JSON.stringify(data,null,2),'utf8')}

async function fetchAllFeeds(){
  var feeds=loadFeeds();
  var allItems=[];
  var seen=new Set();
  for(var cat of feeds.categories){
    for(var feed of cat.feeds){
      try{
        var result=await parser.parseURL(feed.url);
        if(result&&result.items){
          result.items.slice(0,20).forEach(function(item){
            if(item.link&&!seen.has(item.link)){
              seen.add(item.link);
              allItems.push({
                title:item.title||'',
                link:item.link,
                content:item.contentSnippet||item.content||'',
                pubDate:item.pubDate||item.isoDate||'',
                source:feed.name,
                category:cat.name,
                image:item.enclosure&&item.enclosure.url?item.enclosure.url:null
              })
            }
          });
          console.log('\u2713 '+feed.name+' \u2192 '+result.items.length+' \u7bc7');
        }
      }catch(e){
        console.log('\u2717 '+feed.name+' \u8bfb\u53d6\u5931\u8d25');
      }
    }
  }
  allItems.sort(function(a,b){return new Date(b.pubDate)-new Date(a.pubDate)});
  allItems=allItems.slice(0,500);
  var now=new Date();
  saveNews({updated:now.toISOString(),items:allItems});
  console.log('\u5df2\u66f4\u65b0 '+allItems.length+' \u6761\u65b0\u95fb');
  return allItems;
}

app.get('/api/news',function(req,res){
  var data=loadNews();
  var cat=req.query.category;
  var src=req.query.source;
  var q=req.query.q;
  var items=data.items;
  if(cat)items=items.filter(function(i){return i.category===cat});
  if(src)items=items.filter(function(i){return i.source===src});
  if(q)items=items.filter(function(i){return(i.title+' '+i.content).toLowerCase().includes(q.toLowerCase())});
  res.json({updated:data.updated,count:items.length,items:items.slice(0,100)});
});

app.get('/api/feeds',function(req,res){
  var feeds=loadFeeds();
  res.json(feeds);
});

app.get('/api/update',async function(req,res){
  try{await fetchAllFeeds();res.json({ok:true})}catch(e){res.json({ok:false,error:e.message})}
});

cron.schedule('0 8 * * *',function(){console.log('\u5b9a\u65f6\u66f4\u65b0...');fetchAllFeeds();});
cron.schedule('0 20 * * *',function(){console.log('\u5b9a\u65f6\u66f4\u65b0...');fetchAllFeeds();});

app.listen(PORT,'0.0.0.0',function(){
  console.log('News Hub running at http://localhost:'+PORT);
  console.log('\u9996\u6b21\u542f\u52a8\uff0c\u6b63\u5728\u83b7\u53d6\u65b0\u95fb...');
  fetchAllFeeds();
});
