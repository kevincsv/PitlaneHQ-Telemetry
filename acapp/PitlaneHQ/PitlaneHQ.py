# Pitlane HQ for Assetto Corsa: every car on track (driver, car, place, laps, lap times, pit lane and where it is)
# written ten times a second to field.txt beside this file, for the Pitlane HQ Agent on this PC (its relative,
# standings and radar). The agent installs this app and switches it on; it draws nothing.
# Lines: "PHQ1<TAB>tick", then one line per car: id, driver, car, place, laps, place on the lap, last lap (ms),
# best lap (ms), in the pit lane (1/0), world x, world z.
import ac
import acsys
import os

APP = "PitlaneHQ"
DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(DIR, "field.txt")
TMP = OUT + ".tmp"
since = 0.0
tick = 0
told = False


def acMain(ac_version):
    w = ac.newApp(APP)
    ac.setSize(w, 1, 1)
    ac.setTitle(w, "")
    ac.drawBackground(w, 0)
    ac.drawBorder(w, 0)
    ac.setIconPosition(w, 0, -10000)
    return APP


def clean(s):
    return str(s).replace("\t", " ").replace("\r", " ").replace("\n", " ")


def acUpdate(dt):
    global since, tick, told
    since += dt
    if since < 0.1:
        return
    since = 0.0
    tick += 1
    try:
        rows = ["PHQ1\t%d" % tick]
        for i in range(ac.getCarsCount()):
            if i > 0 and not ac.isConnected(i):
                continue
            pos = ac.getCarState(i, acsys.CS.WorldPosition)
            pit = ac.isCarInPitline(i) or ac.isCarInPit(i)
            rows.append("\t".join([
                str(i), clean(ac.getDriverName(i)), clean(ac.getCarName(i)),
                str(ac.getCarRealTimeLeaderboardPosition(i) + 1), str(ac.getCarState(i, acsys.CS.LapCount)),
                "%.5f" % ac.getCarState(i, acsys.CS.NormalizedSplinePosition),
                str(int(ac.getCarState(i, acsys.CS.LastLap))), str(int(ac.getCarState(i, acsys.CS.BestLap))),
                "1" if pit else "0", "%.2f" % pos[0], "%.2f" % pos[2]]))
        with open(TMP, "w", encoding="utf-8") as f:
            f.write("\n".join(rows))
        os.replace(TMP, OUT)
    except Exception as e:
        if not told:
            told = True
            ac.log("PitlaneHQ: %s" % e)


def acShutdown():
    try:
        os.remove(OUT)
    except Exception:
        pass
