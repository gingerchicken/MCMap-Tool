import lxml.html, requests

# Misc Exceptions
class InvalidResponse(Exception):
    """The responce from the MC Wiki was not expected."""

class Colour:
    def __init__(self, r, g, b, a=255):
        self.r = r
        self.g = g
        self.b = b
        
        self.a = a
    
    @staticmethod
    def from_string(text):
        vals = text.split(',')
        
        # Interpret values
        for (i, val) in enumerate(vals):
            vals[i] = int(val.strip())
        
        # Get values
        r = vals[0]
        g = vals[1]
        b = vals[2]

        # Optional
        a = 255
        if len(vals) > 3:
            a = vals[3]

        return Colour(r, g, b, a)

# A way of storing our data instead outside of JSON
class MCColoursVersion:

    def __init__(self, version, colours=[]):
        self.colours = colours
        self.version = version
    
    @staticmethod
    def from_element_table(table, version="Unknown Version"):
        colours = []

        tableBody = None

        # Find the table body
        for child in table.getchildren():
            if child.tag == 'tbody':
                tableBody = child
                break
        
        # Feel free to update these if the site changes.
        TD_INDEX_RGB = 2

        # Let's hope that we got it!
        trs = tableBody.getchildren()
        included_colours = {}
        for tr in trs:
            # Check if it is just a header
            if tr[0].tag == "th":
                # Skip if it is a header
                continue
            
            tds = tr.getchildren()
            colour_text = tds[TD_INDEX_RGB].text.strip().lower()
            
            # # Make sure it ain't a dupe
            # if colour_text in included_colours:
            #     continue

            # Mark it as seen
            included_colours[colour_text] = True

            colour = None
            # Make sure it isn't just a cringe human word (eww... humans)
            if colour_text == "transparent":
                colour = Colour(0, 0, 0)
            else:
                colour = Colour.from_string(colour_text)
            
            # Add the colour to the list
            colours.append(colour)

        return MCColoursVersion(version, colours)


# This is used to scrape the colours from the Minecraft Wiki for easy implementation
class MCWikiScraper:
    __url   = "https://minecraft.gamepedia.com/Map_item_format"
    __html  = None
    __resp  = None
    __etree = None

    def __init__(self):
        # Requests session
        self.__sesh = requests.Session()
        self.__sesh.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36"
        }
    
    # Basic-ish Getters
    def __get_resp(self):
        # Make sure that we have a response
        if self.__resp == None:
            self.__resp = self.__sesh.get(self.get_url())

        # Make sure it is what we want
        # TODO Maybe further varify the request to make sure that everything is as we want.
        if self.__resp.status_code != 200:
            raise InvalidResponse()

        return self.__resp

    def __get_html(self):
        if self.__html == None:
            # Get HTML if we don't have it.
            self.__html = self.__get_resp().text
        
        return self.__html

    def __get_etree(self):
        if self.__etree == None:
            # Get Etree if we don't have it... you get the point I think by now
            self.__etree = lxml.html.fromstring(self.__get_html())
        
        return self.__etree

    def get_url(self):
        return self.__url

    # Scrapes etc.
    def get_captions(self):
        captions = self.__get_etree().xpath('//*[@id="mw-content-text"]/div/table/caption')
        relavent_captions = []
        
        for cap in captions:
            text = cap.text
            
            # Ignore if no text
            if text == None:
                continue

            # Make lowercase and remove whitespace
            text = text.lower().strip()

            # Run checks
            if text.endswith('color table (map color id)'):
                relavent_captions.append(cap)

        return relavent_captions
    
    def get_tables(self, caps=None):
        if caps == None:
            caps = self.get_captions()
        
        return [i.getparent() for i in caps]
    
    def get_colour_versions(self):
        captions = self.get_captions()
        tables   = self.get_tables(captions)
        
        vers = []

        for (i, table) in enumerate(tables):
            caption = captions[i]
            
            # Get the version name
            ver_name = caption.text.lower().replace('color table (map color id)', '').strip()

            # Add version
            vers.append(MCColoursVersion.from_element_table(table, ver_name))
        
        return vers

if __name__ == "__main__":
    import json, argparse
    
    # Argument parser
    argparser = argparse.ArgumentParser()
    argparser.add_argument('destination', help='destination path of the scraped data', type=str)
    args = argparser.parse_args()

    # Arguments
    save_path = args.destination

    # Setup the scraper
    scraper = MCWikiScraper()

    # Get the colour versions from the scraper
    versions = scraper.get_colour_versions()

    # Get an object that we can use later for the JSON conversion
    json_obj = {}

    for version in versions:
        colours = []

        # Turn all the colours into lists and add them to the colours list
        for colour in version.colours:
            colours.append([colour.r, colour.g, colour.b, colour.a])

        # Add it to the JSON object
        json_obj[version.version] = colours
    
    # Dump it to a file
    json.dump(json_obj, open(save_path, 'w'))