import numpy as np, cv2
for f in range(104,131):
    v=cv2.imread(f'../hello/frames/f{f+1:03d}.png').max(2).astype(float)
    band=v[150:262]>140
    n,lab,st,cen=cv2.connectedComponentsWithStats(band.astype(np.uint8))
    blobs=sorted([(int(cen[i][0]),int(st[i,1]+150),int(st[i,4])) for i in range(1,n) if st[i,4]>60])
    # also baseline extents
    m=v>110; cols=np.where(m.sum(0)>2)[0]
    print(f, cols.min(), cols.max(), blobs)
