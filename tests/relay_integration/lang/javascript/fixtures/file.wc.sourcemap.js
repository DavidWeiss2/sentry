{"version":3,"sources":["file1.js","file2.js"],"sourcesContent":["function add(a, b) {\n\t\"use strict\";\n\treturn a + b; // fôo\n}\n","function multiply(a, b) {\n\t\"use strict\";\n\treturn a * b;\n}\nfunction divide(a, b) {\n\t\"use strict\";\n\ttry {\n\t\treturn multiply(add(a, b), a, b) / c;\n\t} catch (e) {\n\t\tRaven.captureException(e);\n\t}\n}\n"],"names":["add","a","b","multiply","divide","c","e","Raven","captureException"],"mappings":"AAAA,SAASA,IAAIC,EAAGC,GACf,aACA,OAAOD,EAAIC,CACZ,CCHA,SAASC,SAASF,EAAGC,GACpB,aACA,OAAOD,EAAIC,CACZ,CACA,SAASE,OAAOH,EAAGC,GAClB,aACA,IACC,OAAOC,SAASH,IAAIC,EAAGC,CAAC,EAAGD,EAAGC,CAAC,EAAIG,CAGpC,CAFE,MAAOC,GACRC,MAAMC,iBAAiBF,CAAC,CACzB,CACD"}
