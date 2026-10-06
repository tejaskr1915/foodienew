const fs = require('fs');
const file = 'c:/web developing/foodie/foodie/src/services/productService.js';
let code = fs.readFileSync(file, 'utf8');

const target = `    } catch (e) {}

      } catch (e) {
        console.error("Error persisting dish category:", e);
      }
    }`;

code = code.replace(target, "    } catch (e) {}");

// Also check for the other occurrence in updateProduct:
const target2 = `    } catch (e) {}

      } catch (e) {
        console.error("Error persisting dish category:", e);
      }`;

code = code.replace(target2, "    } catch (e) {}");

fs.writeFileSync(file, code);
console.log("Fixed productService.js");
