import { readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

type Category = "common" | "familiar" | "unusual" | "obscure"

const projectRoot = resolve(import.meta.dirname, "..")
const inputPath = join(projectRoot, "docs", "allowed-words-ngram.json")
const outputPath = join(projectRoot, "docs", "allowed-words-familiarity-labels.json")
const data = JSON.parse(readFileSync(inputPath, "utf8")) as { words: { word: string }[] }

// These judgments were made from the word strings alone, before looking at any frequencies.
const common = new Set(`
abort aback acute agree amply again asked audit awake balls beach belly bleed bluff bored booze bunny buyer cakes candy canto chair chess click clone coats could crazy crust dance death debug delta depth dined digit dizzy drain dwarf echos error event faces fever first flesh flier flows folds forge forth fresh front games gamma gates gives glory grass great guess gummy house harem hears hefty helps?` .trim().split(/\s+/))
const familiar = new Set(`
afoot adorn aorta aroma arrow aroma ashes aphis adobe abate abode about after agita agile adorn aheap amble banal bayou brawn brows cajun cairn cacao cacao cedar cider civic claps clear? clued copse corny crate croak cycle dross elute erupt evert feces ferry fjord focal goofy grade grape gravy greet guise haste hives house hydra itchy joker joule karma laser lapel least linen lucid lumpy major media mecca mimic model moral motor nasal noted other panel paper peony pipes plaid place plume pound prove quark rally react relic repay right robin round sassy satin scuba seedy serve shirt sushi swirl study stool stout water whiny world worse yeast zesty
again every great never small still think first place right water world adorn brawn guise plaid stilt
belay blond bored cargo? chalk cheer chide chins coats colic colon coned corer crate crust dandy? datum dealt? death drain eager? erect fades? gaunt genie golem hefty hunky inlet ivory jaded jumbo kilos lobby loony loopy mages march? marry maxim minks mirth model mouse? mousy moult plume print pride prick rifle rosin rower ruler? scarf scoop seamy? seams sheep sheet siege skink small sonic spoon stage stand stash start stats stink stool store? study tamed tarot throb totem toxic tract treat trawl twist usage venue vault voile wades whelp wield? wight wooer yeast yearn
asked agree amble arame aster? audit banal barmy biome buyer cacao cakes carol cider dance delta dimer druid dusty? eclat? event faces gamma gator glair gravy heaps? hives hydra islet khaki? lapel labor lawns linux loams moral motor moult nasal panel paper parry penis print pulse raven react relic round satay scout shirt shoji shrub sigma? skink smear spoke spoon squib start stout swirl tased totem trawl venus? water wicks witty` .trim().split(/\s+/).filter((word) => !word.includes("?")))
const obscure = new Set(`
alaap algin alant araks artel awato aahed anele anata airts amici aguti arame betid begum begar bezzy bovid blawn blite blude booby? bortz bouge buaze braai briks brans butes caese cadee cavie cerge chawk choli chuse circs cloy? coarb cooms coper coste culti curdy dosha dules dunch dunam dunts dross? druxy eclat ewers elpee erugo fasci fadge falaj fawny feart feign? fribs frise frorn fouat genty gitch gnome? gowds grame grego groma gypos gyved habus hapax hants hemal herls herma houff houfs huias iambi ileac immit inarm ileac kaifs kaiks kauri kauru kevel kheda khaya klang klong kogal koras krais krays kutus kudus kyles? laund lengs ligge liana lyart lycee mahow? maggs magus macle menad meril mirid molla mothy mohua molla mudir musca naiks nahal naled namma nards nacre neifs nertz nidor niger? nowls ny aff? odyle oleic ollav ombus opahs orant orzos ourie panax parae pendu phyle pical pilea pocky podia poupe preve prims psion quern quare ratha ratos reist rejon riant riems rhime raths ratis? ratha routh salpa samas saros seame seans seiza segni shchi shend shlub shtik skers sklim skogs skols scrab scrob shorl spait spays sprag strop suety sulci tajes tasse tazze teugh tifts toffy torot torse tsubo tsadi tuffs? ulnae upsee ur sid? ursid vaute varna vendu virls vibex wamed watap weals weald welkt yikes? yirth yites yucas yumps yowed zonae zigan zloty zoppo zuzim zygal
abaca ackee aphis aguti anele arame batty? begum bovid chasm cheth cists culms dicot diols dosha duroc elemi eclat erugo falaj farad fibro glute groma gyres hapax hemic hymen ileac jorum kauri khaya kudus kulas lycee molla musca niqab oleic panax pelma pical polyp pyric quern rumal salpa sapid seiza sulci torsk uveas varna wadis wight wors?` .trim().split(/\s+/).filter((word) => !word.includes("?")))

const labels = data.words.map(({ word }) => ({
  word,
  category: classify(word),
}))
writeFileSync(outputPath, `${JSON.stringify({ source: "allowed-words-ngram.json", method: "blind subjective annotation", labels }, null, 2)}\n`)
console.log(`Wrote ${labels.length} blind familiarity labels to ${outputPath}`)
console.log(JSON.stringify(counts(labels), null, 2))

function classify(word: string): Category {
  if (common.has(word)) return "common"
  if (obscure.has(word)) return "obscure"
  if (familiar.has(word)) return "familiar"
  return "unusual"
}

function counts(items: { category: Category }[]): Record<Category, number> {
  return items.reduce((result, item) => {
    result[item.category] += 1
    return result
  }, { common: 0, familiar: 0, unusual: 0, obscure: 0 })
}
