import numpy as np, json
exec(open('depthfit2.py').read().split('g=[720.0')[0])
ctrl=np.array(json.load(open('hello_pts.json')),float)
dense=cr(ctrl); dd=np.r_[0,np.cumsum(np.linalg.norm(np.diff(dense,axis=0),axis=1))]
arc_ctrl=lambda k: dd[min(k*12,len(dense)-1)]
LOOPS=[(0,19),(33,46),(53,67),(75,88),(94,114)]
spans=[(arc_ctrl(a)/3,arc_ctrl(b)/3) for a,b in LOOPS]
W=np.zeros((n,5))
for i in range(n):
    for k in range(5):
        if i<=spans[k][1]:
            if k==0 or i>=spans[k][0]: W[i,k]=1
            else:
                u=(i-spans[k-1][1])/(spans[k][0]-spans[k-1][1]); e=u*u*(3-2*u); W[i,k-1]=1-e; W[i,k]=e
            break
    else: W[i,4]=1
def mono(keys):
    xs,ys=zip(*keys); return lambda x: np.interp(x,xs,ys)
turn=mono([(104,0),(107,10),(110,30),(113,55),(116,74),(118,80),(121,84),(126,86),(140,86)])
pull=mono([(122,0),(124,.1),(125,.25),(126,.4),(127,.55),(128,.72),(129,.88),(129.4,1)])
AX=[380,535,670,783,905]; sl=np.radians(14); SX,SY=np.sin(sl),-np.cos(sl)
def letters(t):
    X=np.zeros(n); Y=np.zeros(n)
    for k in range(5):
        cs=np.cos(np.radians(turn(t-2*k))); dx=c[:,0]-AX[k]; dy=c[:,1]-340
        al=dx*SX+dy*SY; ac=(dx*SY-dy*SX)*cs; ax=AX[k]+(665-AX[k])*pull(t)
        X+=W[:,k]*(ax+al*SX+ac*SY); Y+=W[:,k]*(340+al*SY-ac*SX)
    return np.stack([X,Y],1)
sc=[iou(render(letters(f),np.ones(1)),M[f]) for f in FR]
print('per-letter 2D model turn IoU',round(np.mean(sc),4)); print([round(v,2) for v in sc])
d=json.load(open('depthfit.json')); z=zof(np.array(d['z'])); g=d['g']
print('depth rigid', [round(score_frame(z,f,np.radians(d['theta'][str(f)]),g),2) for f in FR])
